import { mkdir, realpath, stat } from "node:fs/promises";
import { basename, dirname, resolve, sep } from "node:path";
import {
  createWorktreeId,
  LOCAL_HOST_ID,
  type OpenBotWorktree,
  WORKTREE_LIFECYCLE_STATUS_VALUES,
  type WorktreeLifecycleStatus,
  type WorktreeStatus,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import {
  checkedColumn,
  databaseRow,
  databaseRows,
  optionalStringColumn,
  requiredNumberColumn,
  requiredStringColumn,
} from "../database/database-rows";
import { withTransaction } from "../database/sqlite-transaction";
import type { OpenBotDatabase } from "../openbot-database";
import { inspectGitRepository } from "./git-inspect";
import { createGitWorktree, isValidBranchName, listGitWorktrees, removeGitWorktree } from "./git-worktree";
import type { RepositoryStore } from "./repository-store";

export class WorktreeError extends Error {}

const MANAGED_WORKTREES_DIR = ".openbot-worktrees";

function worktreeRow(row: ReturnType<typeof databaseRow>): OpenBotWorktree {
  if (!row) throw new WorktreeError(sourceText("error.backend.worktreeGone"));
  return {
    id: requiredStringColumn(row, "worktree_id"),
    repositoryId: requiredStringColumn(row, "repository_id"),
    hostId: requiredStringColumn(row, "host_id"),
    taskId: optionalStringColumn(row, "task_id"),
    branchName: requiredStringColumn(row, "branch_name"),
    baseRef: optionalStringColumn(row, "base_ref"),
    canonicalPath: requiredStringColumn(row, "canonical_path"),
    managedByApplication: requiredNumberColumn(row, "managed_by_application") === 1,
    lifecycleStatus: checkedColumn(row, "lifecycle_status", WORKTREE_LIFECYCLE_STATUS_VALUES),
    createdAt: requiredStringColumn(row, "created_at"),
    updatedAt: requiredStringColumn(row, "updated_at"),
    archivedAt: optionalStringColumn(row, "archived_at"),
  };
}

function slugifyBranch(branchName: string): string {
  const slug = branchName
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (slug.length === 0) throw new WorktreeError(sourceText("error.backend.worktreeBranchInvalid"));
  return slug;
}

/**
 * Managed path convention: `<repo-parent>/.openbot-worktrees/<repo-name>/<branch-slug>`, sitting
 * beside the repository (git requires a worktree to live outside the main repo's own tree). The
 * branch name is never used verbatim as a path segment — only a sanitized slug is — and the final
 * path is verified to stay inside the managed root (PRD 11.3 "prevent directory traversal"), the
 * same `resolve()` + prefix-check pattern `scripts/dev-automation/tools.ts`'s `resolveWritablePath`
 * already uses elsewhere in this repo.
 */
function managedWorktreePath(repository: { canonicalPath: string }, branchSlug: string): string {
  const root = resolve(dirname(repository.canonicalPath), MANAGED_WORKTREES_DIR, basename(repository.canonicalPath));
  const target = resolve(root, branchSlug);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new WorktreeError(sourceText("error.backend.worktreePathInvalid"));
  }
  return target;
}

/**
 * Direct CRUD on `projection_worktrees`, same non-event-sourced shape as `RepositoryStore` (see
 * migration 0072). `git-worktree.ts` is the only part of this store that leaves the process or
 * touches disk beyond the SQLite file.
 */
export class WorktreeStore {
  constructor(
    private readonly database: OpenBotDatabase,
    private readonly repositories: RepositoryStore,
  ) {}

  async createWorktree(
    repositoryId: string,
    branchName: string,
    baseRef: string | null,
    now = new Date().toISOString(),
  ): Promise<OpenBotWorktree> {
    const repository = this.repositories.requireRepository(repositoryId);
    const trimmedBranch = branchName.trim();
    if (trimmedBranch.length === 0 || !(await isValidBranchName(trimmedBranch))) {
      throw new WorktreeError(sourceText("error.backend.worktreeBranchInvalid"));
    }
    const path = managedWorktreePath(repository, slugifyBranch(trimmedBranch));
    await mkdir(dirname(path), { recursive: true });
    try {
      await createGitWorktree(repository.canonicalPath, path, trimmedBranch, baseRef);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (/already exists/i.test(message)) throw new WorktreeError(sourceText("error.backend.branchAlreadyExists"));
      throw new WorktreeError(message);
    }
    const canonicalPath = await realpath(path);
    const db = this.database.connection;
    return withTransaction(db, () => {
      const worktree: OpenBotWorktree = {
        id: createWorktreeId(),
        repositoryId: repository.id,
        hostId: LOCAL_HOST_ID,
        taskId: null,
        branchName: trimmedBranch,
        baseRef,
        canonicalPath,
        managedByApplication: true,
        lifecycleStatus: "active",
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      db.prepare(
        `INSERT INTO projection_worktrees (
           worktree_id, repository_id, host_id, task_id, branch_name, base_ref, canonical_path,
           managed_by_application, lifecycle_status, created_at, updated_at, archived_at
         ) VALUES (?, ?, ?, NULL, ?, ?, ?, 1, 'active', ?, ?, NULL)`,
      ).run(
        worktree.id,
        worktree.repositoryId,
        worktree.hostId,
        worktree.branchName,
        worktree.baseRef,
        worktree.canonicalPath,
        now,
        now,
      );
      return worktree;
    });
  }

  listWorktreesForRepository(repositoryId: string): OpenBotWorktree[] {
    return databaseRows(
      this.database.connection
        .prepare("SELECT * FROM projection_worktrees WHERE repository_id = ? ORDER BY created_at")
        .all(repositoryId),
    ).map((row) => worktreeRow(row));
  }

  getWorktree(worktreeId: string): OpenBotWorktree | null {
    const row = databaseRow(
      this.database.connection.prepare("SELECT * FROM projection_worktrees WHERE worktree_id = ?").get(worktreeId),
    );
    return row ? worktreeRow(row) : null;
  }

  requireWorktree(worktreeId: string): OpenBotWorktree {
    const worktree = this.getWorktree(worktreeId);
    if (!worktree) throw new WorktreeError(sourceText("error.backend.worktreeGone"));
    return worktree;
  }

  async inspectWorktree(worktreeId: string): Promise<WorktreeStatus> {
    const worktree = this.requireWorktree(worktreeId);
    let exists = true;
    try {
      await stat(worktree.canonicalPath);
    } catch {
      exists = false;
    }
    if (!exists) return { worktreeId, exists: false, isWorkingTree: false, currentBranch: null, dirty: null };
    const inspection = await inspectGitRepository(worktree.canonicalPath);
    return {
      worktreeId,
      exists: true,
      isWorkingTree: inspection.isWorkingTree,
      currentBranch: inspection.currentBranch,
      dirty: inspection.dirty,
    };
  }

  /** Detects a worktree whose on-disk path or Git registration is gone (PRD FR-09 "stale"). Never deletes the row. */
  async refreshWorktree(worktreeId: string, now = new Date().toISOString()): Promise<OpenBotWorktree> {
    const worktree = this.requireWorktree(worktreeId);
    const status = await this.inspectWorktree(worktreeId);
    const nextStatus: WorktreeLifecycleStatus =
      worktree.lifecycleStatus === "archived" ? "archived" : status.exists && status.isWorkingTree ? "active" : "stale";
    const db = this.database.connection;
    return withTransaction(db, () => {
      db.prepare("UPDATE projection_worktrees SET lifecycle_status = ?, updated_at = ? WHERE worktree_id = ?").run(
        nextStatus,
        now,
        worktreeId,
      );
      return this.requireWorktree(worktreeId);
    });
  }

  /**
   * Never removes a dirty worktree unless `force` is explicitly true (PRD 11.2/FR-09: "Never
   * remove dirty worktrees automatically", "Never use force removal by default"). The caller —
   * the IPC handler — is where that authorization decision belongs; this method only enforces it.
   */
  async removeWorktree(worktreeId: string, force: boolean): Promise<void> {
    const worktree = this.requireWorktree(worktreeId);
    const repository = this.repositories.requireRepository(worktree.repositoryId);
    const status = await this.inspectWorktree(worktreeId);
    if (status.exists && status.dirty && !force) {
      throw new WorktreeError(sourceText("error.backend.worktreeDirtyRemovalRequiresForce"));
    }
    if (status.exists) {
      await removeGitWorktree(repository.canonicalPath, worktree.canonicalPath, force);
    }
    this.database.connection.prepare("DELETE FROM projection_worktrees WHERE worktree_id = ?").run(worktreeId);
  }

  /** PRD FR-09 "detect worktrees created outside the application": known to Git, unknown to this app. */
  async listUntrackedWorktreePaths(repositoryId: string): Promise<string[]> {
    const repository = this.repositories.requireRepository(repositoryId);
    const gitWorktrees = await listGitWorktrees(repository.canonicalPath);
    const known = new Set(this.listWorktreesForRepository(repositoryId).map((worktree) => worktree.canonicalPath));
    return gitWorktrees
      .map((entry) => entry.path)
      .filter((path) => path !== repository.canonicalPath && !known.has(path));
  }
}
