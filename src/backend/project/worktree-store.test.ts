// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCauseEffect } from "../effect-boundary";
import { OpenBotDatabase } from "../openbot-database";
import { ProjectStore } from "./project-store";
import { RepositoryStore } from "./repository-store";
import { WorktreeError, WorktreeStore } from "./worktree-store";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createStores(): Promise<{
  projects: ProjectStore;
  repositories: RepositoryStore;
  worktrees: WorktreeStore;
}> {
  const root = await mkdtemp(join(tmpdir(), "openbot-worktree-store-"));
  roots.push(root);
  const database = new OpenBotDatabase(root);
  await runCauseEffect(database.initialize());
  const repositories = new RepositoryStore(database);
  return { projects: new ProjectStore(database), repositories, worktrees: new WorktreeStore(database, repositories) };
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd }).toString();
}

async function createRealGitRepo(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `openbot-worktree-git-${name}-`));
  roots.push(root);
  git(root, ["init", "--quiet", "--initial-branch=main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  await writeFile(join(root, "MARKER.txt"), `marker: ${name}\n`);
  git(root, ["add", "-A"]);
  git(root, ["commit", "--quiet", "-m", "Initial commit"]);
  return root;
}

/** Managed worktrees live beside the repo, at `<repo-parent>/.openbot-worktrees/<repo-name>/...` — clean that up too. */
function trackManagedWorktreesRoot(repoPath: string): void {
  roots.push(join(dirname(repoPath), ".openbot-worktrees"));
}

describe("WorktreeStore", () => {
  it("creates a managed worktree on a new branch, isolated from the primary working tree", async () => {
    const { projects, repositories, worktrees } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("create");
    trackManagedWorktreesRoot(repoPath);
    const repository = await repositories.importRepository(project.id, repoPath);

    const worktree = await worktrees.createWorktree(repository.id, "feat/timeline-editor", null);

    expect(worktree.branchName).toBe("feat/timeline-editor");
    expect(worktree.canonicalPath).not.toBe(repository.canonicalPath);
    expect(worktree.lifecycleStatus).toBe("active");
    expect(worktrees.listWorktreesForRepository(repository.id)).toHaveLength(1);

    // Primary working tree is untouched: still on `main`, no new worktree-only files leaked in.
    expect(git(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]).trim()).toBe("main");
    await expect(readFile(join(repoPath, "worktree-only.txt"), "utf8")).rejects.toThrow();
  });

  it("two worktrees for the same repository are isolated: a file written in one never appears in the other", async () => {
    const { projects, repositories, worktrees } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("isolation");
    trackManagedWorktreesRoot(repoPath);
    const repository = await repositories.importRepository(project.id, repoPath);

    const worktreeA = await worktrees.createWorktree(repository.id, "feature-a", null);
    const worktreeB = await worktrees.createWorktree(repository.id, "feature-b", null);

    await writeFile(join(worktreeA.canonicalPath, "only-in-a.txt"), "a");
    await writeFile(join(worktreeB.canonicalPath, "only-in-b.txt"), "b");

    await expect(readFile(join(worktreeB.canonicalPath, "only-in-a.txt"), "utf8")).rejects.toThrow();
    await expect(readFile(join(worktreeA.canonicalPath, "only-in-b.txt"), "utf8")).rejects.toThrow();
    await expect(readFile(join(repoPath, "only-in-a.txt"), "utf8")).rejects.toThrow();
  });

  it("refuses a branch name that attempts directory traversal", async () => {
    const { projects, repositories, worktrees } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("traversal");
    trackManagedWorktreesRoot(repoPath);
    const repository = await repositories.importRepository(project.id, repoPath);

    await expect(worktrees.createWorktree(repository.id, "../../etc/evil", null)).rejects.toThrow(WorktreeError);
    expect(worktrees.listWorktreesForRepository(repository.id)).toHaveLength(0);
  });

  it("refuses to create a worktree on a branch name that already exists", async () => {
    const { projects, repositories, worktrees } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("duplicate-branch");
    trackManagedWorktreesRoot(repoPath);
    const repository = await repositories.importRepository(project.id, repoPath);
    await worktrees.createWorktree(repository.id, "feature-x", null);

    await expect(worktrees.createWorktree(repository.id, "feature-x", null)).rejects.toThrow(WorktreeError);
  });

  it("refuses to remove a dirty worktree without force, and keeps its files", async () => {
    const { projects, repositories, worktrees } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("dirty-remove");
    trackManagedWorktreesRoot(repoPath);
    const repository = await repositories.importRepository(project.id, repoPath);
    const worktree = await worktrees.createWorktree(repository.id, "feature-dirty", null);
    await writeFile(join(worktree.canonicalPath, "uncommitted.txt"), "work in progress");

    await expect(worktrees.removeWorktree(worktree.id, false)).rejects.toThrow(WorktreeError);

    expect(worktrees.getWorktree(worktree.id)).not.toBeNull();
    await expect(readFile(join(worktree.canonicalPath, "uncommitted.txt"), "utf8")).resolves.toBe("work in progress");
  });

  it("removes a dirty worktree when force is explicitly true", async () => {
    const { projects, repositories, worktrees } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("force-remove");
    trackManagedWorktreesRoot(repoPath);
    const repository = await repositories.importRepository(project.id, repoPath);
    const worktree = await worktrees.createWorktree(repository.id, "feature-force", null);
    await writeFile(join(worktree.canonicalPath, "uncommitted.txt"), "work in progress");

    await worktrees.removeWorktree(worktree.id, true);

    expect(worktrees.getWorktree(worktree.id)).toBeNull();
  });

  it("removes a clean worktree without force", async () => {
    const { projects, repositories, worktrees } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("clean-remove");
    trackManagedWorktreesRoot(repoPath);
    const repository = await repositories.importRepository(project.id, repoPath);
    const worktree = await worktrees.createWorktree(repository.id, "feature-clean", null);

    await worktrees.removeWorktree(worktree.id, false);

    expect(worktrees.getWorktree(worktree.id)).toBeNull();
  });

  it("marks a worktree stale on refresh when its folder was removed outside the application", async () => {
    const { projects, repositories, worktrees } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("stale");
    trackManagedWorktreesRoot(repoPath);
    const repository = await repositories.importRepository(project.id, repoPath);
    const worktree = await worktrees.createWorktree(repository.id, "feature-stale", null);

    await rm(worktree.canonicalPath, { recursive: true, force: true });
    const refreshed = await worktrees.refreshWorktree(worktree.id);

    expect(refreshed.lifecycleStatus).toBe("stale");
    expect(worktrees.getWorktree(worktree.id)).not.toBeNull();
  });
});
