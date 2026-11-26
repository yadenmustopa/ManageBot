// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentSummary } from "@openbot/contracts/ipc";
import { afterEach, describe, expect, it } from "vitest";
import { runCauseEffect } from "../effect-boundary";
import { OpenBotDatabase } from "../openbot-database";
import { ProjectStore } from "./project-store";
import { resolveAgentExecutionContext } from "./repository-context-resolver";
import { RepositoryStore } from "./repository-store";
import { ThreadRepositoryScopeStore } from "./thread-repository-scope";
import { WorktreeStore } from "./worktree-store";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createDatabase(): Promise<OpenBotDatabase> {
  const root = await mkdtemp(join(tmpdir(), "openbot-context-resolver-"));
  roots.push(root);
  const database = new OpenBotDatabase(root);
  await runCauseEffect(database.initialize());
  return database;
}

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd });
}

async function createRealGitRepo(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `openbot-context-git-${name}-`));
  roots.push(root);
  git(root, ["init", "--quiet", "--initial-branch=main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  await writeFile(join(root, "MARKER.txt"), `marker: ${name}\n`);
  git(root, ["add", "-A"]);
  git(root, ["commit", "--quiet", "-m", "Initial commit"]);
  return root;
}

function testAgent(id: string, threadId: string, workspacePath: string): AgentSummary {
  return {
    id,
    provider: "codex",
    name: id,
    title: "",
    description: "",
    notifications: true,
    model: "gpt-5.6-luna",
    reasoningEffort: "medium",
    threadId,
    workspacePath,
    preview: "",
    updatedAt: "2026-08-18T10:00:01.000Z",
    avatarSeed: id,
    avatarHue: null,
    avatarUrl: null,
  };
}

describe("resolveAgentExecutionContext", () => {
  it("resolves two repository-scoped threads to their own, different repositories (no cross-repository bleed)", async () => {
    const database = await createDatabase();
    const agentA = testAgent("agent-a", "thread-a", "/tmp/openbot-agent-a-workspace");
    const agentB = testAgent("agent-b", "thread-b", "/tmp/openbot-agent-b-workspace");
    database.replaceAgents("agents-import", [agentA, agentB], "agents.imported");

    const projects = new ProjectStore(database);
    const repositories = new RepositoryStore(database);
    const scopes = new ThreadRepositoryScopeStore(database);
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Isolation test" });
    const repoA = await repositories.importRepository(project.id, await createRealGitRepo("repo-a"));
    const repoB = await repositories.importRepository(project.id, await createRealGitRepo("repo-b"));
    scopes.setScope("thread-a", project.id, repoA.id);
    scopes.setScope("thread-b", project.id, repoB.id);

    const contextA = await runCauseEffect(resolveAgentExecutionContext(database, agentA, "thread-a", "/tmp/shared"));
    const contextB = await runCauseEffect(resolveAgentExecutionContext(database, agentB, "thread-b", "/tmp/shared"));

    expect(contextA.cwd).toBe(repoA.canonicalPath);
    expect(contextB.cwd).toBe(repoB.canonicalPath);
    expect(contextA.cwd).not.toBe(contextB.cwd);
    expect(contextA.repositoryId).toBe(repoA.id);
    expect(contextB.repositoryId).toBe(repoB.id);
    expect(contextA.writableRoots).toContain(repoA.canonicalPath);
    expect(contextA.writableRoots).not.toContain(repoB.canonicalPath);
  });

  it("resolves an unscoped thread to exactly the agent's own workspace, unchanged", async () => {
    const database = await createDatabase();
    const agent = testAgent("agent-solo", "thread-solo", "/tmp/openbot-agent-solo-workspace");
    database.replaceAgents("agents-import", [agent], "agents.imported");

    const scoped = await runCauseEffect(resolveAgentExecutionContext(database, agent, "thread-solo", "/tmp/shared"));
    const noThread = await runCauseEffect(resolveAgentExecutionContext(database, agent, undefined, "/tmp/shared"));

    for (const context of [scoped, noThread]) {
      expect(context.cwd).toBe(agent.workspacePath);
      expect(context.repositoryId).toBeNull();
      expect(context.writableRoots).toContain(agent.workspacePath);
      expect(context.writableRoots).toContain("/tmp/shared");
    }
  });

  it("fails explicitly, without falling back, when a scoped repository's folder has been removed", async () => {
    const database = await createDatabase();
    const agent = testAgent("agent-missing", "thread-missing", "/tmp/openbot-agent-missing-workspace");
    database.replaceAgents("agents-import", [agent], "agents.imported");

    const projects = new ProjectStore(database);
    const repositories = new RepositoryStore(database);
    const scopes = new ThreadRepositoryScopeStore(database);
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Missing repo test" });
    const repoPath = await createRealGitRepo("vanishing");
    const repository = await repositories.importRepository(project.id, repoPath);
    scopes.setScope("thread-missing", project.id, repository.id);

    await rm(repoPath, { recursive: true, force: true });

    await expect(
      runCauseEffect(resolveAgentExecutionContext(database, agent, "thread-missing", "/tmp/shared")),
    ).rejects.toThrow("This folder does not exist.");
  });

  // A scope row pointing at a repository id that doesn't exist in `projection_repositories` can't
  // actually be constructed: `thread_repository_scope.repository_id` has a foreign key against it,
  // enforced on every write (see the FOREIGN KEY constraint failure this test used to hit before
  // it was removed). `resolveAgentExecutionContext`'s `repositoryGone` branch is defense-in-depth
  // for that column reaching NULL some other way, not a reachable state under today's schema.

  it("resolves a worktree-scoped thread to the worktree's path, not the repository root (Phase 3)", async () => {
    const database = await createDatabase();
    const agent = testAgent("agent-worktree", "thread-worktree", "/tmp/openbot-agent-worktree-workspace");
    database.replaceAgents("agents-import", [agent], "agents.imported");

    const projects = new ProjectStore(database);
    const repositories = new RepositoryStore(database);
    const worktrees = new WorktreeStore(database, repositories);
    const scopes = new ThreadRepositoryScopeStore(database);
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Worktree scope test" });
    const repository = await repositories.importRepository(project.id, await createRealGitRepo("worktree-scope-repo"));
    const worktree = await worktrees.createWorktree(repository.id, "feature-worktree-scope", null);
    roots.push(join(worktree.canonicalPath, ".."));
    scopes.setScope("thread-worktree", project.id, repository.id, worktree.id);

    const context = await runCauseEffect(
      resolveAgentExecutionContext(database, agent, "thread-worktree", "/tmp/shared"),
    );

    expect(context.cwd).toBe(worktree.canonicalPath);
    expect(context.cwd).not.toBe(repository.canonicalPath);
    expect(context.repositoryId).toBe(repository.id);
    expect(context.writableRoots).toContain(worktree.canonicalPath);
  });

  it("falls back to the repository root exactly as Phase 2 did when a thread's scope has no worktree", async () => {
    const database = await createDatabase();
    const agent = testAgent("agent-repo-only", "thread-repo-only", "/tmp/openbot-agent-repo-only-workspace");
    database.replaceAgents("agents-import", [agent], "agents.imported");

    const projects = new ProjectStore(database);
    const repositories = new RepositoryStore(database);
    const scopes = new ThreadRepositoryScopeStore(database);
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Repo only test" });
    const repository = await repositories.importRepository(project.id, await createRealGitRepo("repo-only"));
    scopes.setScope("thread-repo-only", project.id, repository.id);

    const context = await runCauseEffect(
      resolveAgentExecutionContext(database, agent, "thread-repo-only", "/tmp/shared"),
    );

    expect(context.cwd).toBe(repository.canonicalPath);
    expect(context.repositoryId).toBe(repository.id);
  });
});
