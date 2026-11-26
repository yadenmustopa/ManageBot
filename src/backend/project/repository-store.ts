import { realpath, stat } from "node:fs/promises";
import { basename } from "node:path";
import {
  createRepositoryId,
  LOCAL_HOST_ID,
  type OpenBotRepository,
  REPOSITORY_HEALTH_VALUES,
  type RepositoryHealth,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import {
  checkedColumn,
  databaseRow,
  databaseRows,
  requiredNumberColumn,
  requiredStringColumn,
} from "../database/database-rows";
import { withTransaction } from "../database/sqlite-transaction";
import type { OpenBotDatabase } from "../openbot-database";
import { type GitInspection, inspectGitRepository } from "./git-inspect";

export class RepositoryError extends Error {}

function repositoryRow(row: ReturnType<typeof databaseRow>): OpenBotRepository {
  if (!row) throw new RepositoryError(sourceText("error.backend.repositoryGone"));
  return {
    id: requiredStringColumn(row, "repository_id"),
    hostId: requiredStringColumn(row, "host_id"),
    name: requiredStringColumn(row, "name"),
    canonicalPath: requiredStringColumn(row, "canonical_path"),
    remoteUrl: row.remote_url === null ? null : requiredStringColumn(row, "remote_url"),
    currentBranch: row.current_branch === null ? null : requiredStringColumn(row, "current_branch"),
    defaultBranch: row.default_branch === null ? null : requiredStringColumn(row, "default_branch"),
    dirty: row.dirty === null ? null : requiredNumberColumn(row, "dirty") === 1,
    health: checkedColumn(row, "health", REPOSITORY_HEALTH_VALUES),
    lastRefreshedAt: requiredStringColumn(row, "last_refreshed_at"),
    createdAt: requiredStringColumn(row, "created_at"),
    updatedAt: requiredStringColumn(row, "updated_at"),
    archivedAt: row.archived_at === null ? null : requiredStringColumn(row, "archived_at"),
  };
}

function healthOf(
  inspection: Pick<GitInspection, "isWorkingTree" | "currentBranch" | "dirty">,
): Exclude<RepositoryHealth, "missing"> {
  if (!inspection.isWorkingTree) return "available";
  if (inspection.currentBranch === null) return "detached-head";
  if (inspection.dirty) return "dirty";
  return "available";
}

/**
 * Resolves and validates a folder for repository import (PRD FR-03 Method A). Read-only: never
 * creates, moves or deletes anything on disk. Resolves through symlinks with `realpath` so the
 * stored `canonical_path` is the real, de-duplicated location (PRD 11.3 "validate canonical
 * paths" / "validate symlink boundaries").
 */
async function resolveImportPath(path: string): Promise<string> {
  const trimmed = path.trim();
  if (trimmed.length === 0) throw new RepositoryError(sourceText("error.backend.repositoryPathRequired"));
  let canonical: string;
  try {
    canonical = await realpath(trimmed);
  } catch {
    throw new RepositoryError(sourceText("error.backend.repositoryPathMissing"));
  }
  const info = await stat(canonical);
  if (!info.isDirectory()) throw new RepositoryError(sourceText("error.backend.repositoryPathNotDirectory"));
  return canonical;
}

/**
 * Direct CRUD on `projection_repositories` / `project_repositories`, the same non-event-sourced
 * shape as `ProjectStore` (see `migrations/0070-projects.ts`). Git inspection (`git-inspect.ts`)
 * is the only part of this store that leaves the process; everything else is plain SQLite.
 */
export class RepositoryStore {
  constructor(private readonly database: OpenBotDatabase) {}

  async importRepository(projectId: string, path: string, now = new Date().toISOString()): Promise<OpenBotRepository> {
    const canonicalPath = await resolveImportPath(path);
    const inspection = await inspectGitRepository(canonicalPath);
    const db = this.database.connection;
    return withTransaction(db, () => {
      const project = databaseRow(
        db.prepare("SELECT project_id FROM projection_projects WHERE project_id = ?").get(projectId),
      );
      if (!project) throw new RepositoryError(sourceText("error.backend.projectGone"));

      const existing = databaseRow(
        db
          .prepare("SELECT * FROM projection_repositories WHERE host_id = ? AND canonical_path = ?")
          .get(LOCAL_HOST_ID, canonicalPath),
      );
      const repository: OpenBotRepository = existing
        ? repositoryRow(existing)
        : {
            id: createRepositoryId(),
            hostId: LOCAL_HOST_ID,
            name: basename(canonicalPath),
            canonicalPath,
            remoteUrl: inspection.remoteUrl,
            currentBranch: inspection.currentBranch,
            defaultBranch: inspection.defaultBranch,
            dirty: inspection.dirty,
            health: healthOf(inspection),
            lastRefreshedAt: now,
            createdAt: now,
            updatedAt: now,
            archivedAt: null,
          };
      if (!existing) {
        db.prepare(
          `INSERT INTO projection_repositories (
             repository_id, host_id, name, canonical_path, remote_url, current_branch, default_branch,
             dirty, health, last_refreshed_at, created_at, updated_at, archived_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        ).run(
          repository.id,
          repository.hostId,
          repository.name,
          repository.canonicalPath,
          repository.remoteUrl,
          repository.currentBranch,
          repository.defaultBranch,
          repository.dirty === null ? null : repository.dirty ? 1 : 0,
          repository.health,
          repository.lastRefreshedAt,
          now,
          now,
        );
      }
      const link = databaseRow(
        db
          .prepare("SELECT 1 AS linked FROM project_repositories WHERE project_id = ? AND repository_id = ?")
          .get(projectId, repository.id),
      );
      if (link) throw new RepositoryError(sourceText("error.backend.repositoryAlreadyInProject"));
      const nextOrder = requiredNumberColumn(
        databaseRow(
          db
            .prepare("SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM project_repositories WHERE project_id = ?")
            .get(projectId),
        ) ?? { next: 0 },
        "next",
      );
      db.prepare(
        "INSERT INTO project_repositories (project_id, repository_id, sort_order, created_at) VALUES (?, ?, ?, ?)",
      ).run(projectId, repository.id, nextOrder, now);
      return repository;
    });
  }

  listRepositoriesForProject(projectId: string): OpenBotRepository[] {
    return databaseRows(
      this.database.connection
        .prepare(
          `SELECT r.* FROM projection_repositories r
           JOIN project_repositories pr ON pr.repository_id = r.repository_id
           WHERE pr.project_id = ?
           ORDER BY pr.sort_order, r.created_at`,
        )
        .all(projectId),
    ).map((row) => repositoryRow(row));
  }

  getRepository(repositoryId: string): OpenBotRepository | null {
    const row = databaseRow(
      this.database.connection
        .prepare("SELECT * FROM projection_repositories WHERE repository_id = ?")
        .get(repositoryId),
    );
    return row ? repositoryRow(row) : null;
  }

  requireRepository(repositoryId: string): OpenBotRepository {
    const repository = this.getRepository(repositoryId);
    if (!repository) throw new RepositoryError(sourceText("error.backend.repositoryGone"));
    return repository;
  }

  /** Re-runs Git inspection and refreshes the stored metadata. Never touches disk. */
  async refreshRepository(repositoryId: string, now = new Date().toISOString()): Promise<OpenBotRepository> {
    const current = this.requireRepository(repositoryId);
    let exists = true;
    try {
      await stat(current.canonicalPath);
    } catch {
      exists = false;
    }
    const inspection: Pick<GitInspection, "isWorkingTree" | "remoteUrl" | "currentBranch" | "defaultBranch" | "dirty"> =
      exists
        ? await inspectGitRepository(current.canonicalPath)
        : { isWorkingTree: false, remoteUrl: null, currentBranch: null, defaultBranch: null, dirty: null };
    const health: RepositoryHealth = exists ? healthOf(inspection) : "missing";
    const db = this.database.connection;
    return withTransaction(db, () => {
      db.prepare(
        `UPDATE projection_repositories
           SET remote_url = ?, current_branch = ?, default_branch = ?, dirty = ?, health = ?,
               last_refreshed_at = ?, updated_at = ?
         WHERE repository_id = ?`,
      ).run(
        inspection.remoteUrl,
        inspection.currentBranch,
        inspection.defaultBranch,
        inspection.dirty === null ? null : inspection.dirty ? 1 : 0,
        health,
        now,
        now,
        repositoryId,
      );
      return this.requireRepository(repositoryId);
    });
  }

  /** Removes only the project's association. Never deletes the repository row or disk files. */
  detachRepository(projectId: string, repositoryId: string): void {
    this.database.connection
      .prepare("DELETE FROM project_repositories WHERE project_id = ? AND repository_id = ?")
      .run(projectId, repositoryId);
  }
}
