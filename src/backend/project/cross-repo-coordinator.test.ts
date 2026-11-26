// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentSummary } from "@openbot/contracts/ipc";
import { afterEach, describe, expect, it } from "vitest";
import { runCauseEffect } from "../effect-boundary";
import { OpenBotDatabase } from "../openbot-database";
import { summarizeCrossRepoTask } from "./cross-repo-coordinator";
import { DevelopmentTaskStore } from "./development-task-store";
import { ProjectStore } from "./project-store";
import { resolveAgentExecutionContext } from "./repository-context-resolver";
import { RepositoryStore } from "./repository-store";
import { ThreadRepositoryScopeStore } from "./thread-repository-scope";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createRepo(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `openbot-xrepo-${name}-`));
  roots.push(root);
  execFileSync("git", ["init", "--quiet", "--initial-branch=main"], { cwd: root });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
  await writeFile(join(root, "README.md"), `# ${name}\n`);
  execFileSync("git", ["add", "-A"], { cwd: root });
  execFileSync("git", ["commit", "--quiet", "-m", "init"], { cwd: root });
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

describe("Phase 7 cross-repository coordination and host isolation", () => {
  it("computes dependency-ordered merge sequence and partial progress across repositories", async () => {
    const root = await mkdtemp(join(tmpdir(), "openbot-xrepo-db-"));
    roots.push(root);
    const database = new OpenBotDatabase(root);
    await runCauseEffect(database.initialize());
    const projects = new ProjectStore(database);
    const repositories = new RepositoryStore(database);
    const tasks = new DevelopmentTaskStore(database);

    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Ecosystem" });
    const backendRepo = await repositories.importRepository(project.id, await createRepo("backend"));
    const desktopRepo = await repositories.importRepository(project.id, await createRepo("desktop"));

    const parent = tasks.createTask({ projectId: project.id, title: "Implement new media API" });
    const backendTask = tasks.createTask({
      projectId: project.id,
      repositoryId: backendRepo.id,
      parentTaskId: parent.id,
      title: "Backend endpoint",
    });
    const desktopTask = tasks.createTask({
      projectId: project.id,
      repositoryId: desktopRepo.id,
      parentTaskId: parent.id,
      title: "Desktop client",
    });
    tasks.addDependency(desktopTask.id, backendTask.id);

    const partial = summarizeCrossRepoTask(tasks, parent.id);
    expect(partial.subtasks).toHaveLength(2);
    expect(partial.mergeOrder).toEqual([backendTask.id, desktopTask.id]);
    expect(partial.completedCount).toBe(0);
    expect(partial.allSubtasksDone).toBe(false);

    tasks.updateTask({ taskId: backendTask.id, status: "done", testEvidence: "passed" });
    tasks.updateTask({ taskId: desktopTask.id, status: "ready-to-merge" });
    const finished = summarizeCrossRepoTask(tasks, parent.id);
    expect(finished.completedCount).toBe(2);
    expect(finished.allSubtasksDone).toBe(true);
  });

  it("refuses executing a remote-host repository on the local computer", async () => {
    const root = await mkdtemp(join(tmpdir(), "openbot-remote-host-db-"));
    roots.push(root);
    const database = new OpenBotDatabase(root);
    await runCauseEffect(database.initialize());
    const agent = testAgent("agent-remote", "thread-remote", "/tmp/openbot-agent-remote");
    database.replaceAgents("agents-import", [agent], "agents.imported");

    const projects = new ProjectStore(database);
    const repositories = new RepositoryStore(database);
    const scopes = new ThreadRepositoryScopeStore(database);
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Remote" });
    const repo = await repositories.importRepository(project.id, await createRepo("remote"));
    database.connection
      .prepare("UPDATE projection_repositories SET host_id = ? WHERE repository_id = ?")
      .run("remote-vps-1", repo.id);
    scopes.setScope("thread-remote", project.id, repo.id);

    await expect(
      runCauseEffect(resolveAgentExecutionContext(database, agent, "thread-remote", "/tmp/shared")),
    ).rejects.toThrow("This repository belongs to a remote execution host and cannot run on the local computer.");
  });
});
