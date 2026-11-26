// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCauseEffect } from "../effect-boundary";
import { OpenBotDatabase } from "../openbot-database";
import { CodingWorkflowStore } from "./coding-workflow-store";
import { DevelopmentTaskStore } from "./development-task-store";
import { ProjectStore } from "./project-store";
import { RepositoryStore } from "./repository-store";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createRepo(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `openbot-wf-repo-${name}-`));
  roots.push(root);
  execFileSync("git", ["init", "--quiet", "--initial-branch=main"], { cwd: root });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
  await writeFile(join(root, "README.md"), "# Test\n");
  execFileSync("git", ["add", "-A"], { cwd: root });
  execFileSync("git", ["commit", "--quiet", "-m", "init"], { cwd: root });
  return root;
}

async function createStores() {
  const root = await mkdtemp(join(tmpdir(), "openbot-coding-wf-"));
  roots.push(root);
  const database = new OpenBotDatabase(root);
  await runCauseEffect(database.initialize());
  const projects = new ProjectStore(database);
  const repositories = new RepositoryStore(database);
  const tasks = new DevelopmentTaskStore(database);
  return { projects, repositories, tasks, workflows: new CodingWorkflowStore(tasks) };
}

describe("CodingWorkflowStore", () => {
  it("runs through planning, implementation, testing, review, and human approval", async () => {
    const { projects, repositories, tasks, workflows } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar" });
    const repo = await repositories.importRepository(project.id, await createRepo("run"));
    const task = tasks.createTask({ projectId: project.id, repositoryId: repo.id, title: "Add feature" });

    let run = workflows.startRun({ taskId: task.id });
    expect(run.currentStep).toBe("plan");
    expect(run.repositoryId).toBe(repo.id);

    run = workflows.advanceRun({ runId: run.id });
    expect(run.currentStep).toBe("worktree");
    run = workflows.advanceRun({ runId: run.id });
    expect(run.currentStep).toBe("implement");
    run = workflows.advanceRun({ runId: run.id });
    expect(run.currentStep).toBe("test");
    run = workflows.advanceRun({ runId: run.id, testsPassed: true });
    expect(run.currentStep).toBe("review");
    run = workflows.advanceRun({ runId: run.id, reviewPassed: true });
    expect(run.currentStep).toBe("approval");
    expect(run.status).toBe("awaiting-approval");

    run = workflows.advanceRun({ runId: run.id, approved: true });
    expect(run.status).toBe("completed");
    expect(tasks.requireTask(task.id).status).toBe("ready-to-merge");
  });

  it("blocks the task when tests fail and enforces bounded review loops", async () => {
    const { projects, repositories, tasks, workflows } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar" });
    const repo = await repositories.importRepository(project.id, await createRepo("fail"));
    const task = tasks.createTask({ projectId: project.id, repositoryId: repo.id, title: "Fix bug" });

    let run = workflows.startRun({ taskId: task.id, maxReviewIterations: 2 });
    run = workflows.advanceRun({ runId: run.id });
    run = workflows.advanceRun({ runId: run.id });
    run = workflows.advanceRun({ runId: run.id });
    const failed = workflows.advanceRun({ runId: run.id, testsPassed: false, note: "vitest failed" });
    expect(failed.status).toBe("failed");
    expect(tasks.requireTask(task.id).status).toBe("blocked");

    let reviewRun = workflows.startRun({ taskId: task.id, maxReviewIterations: 2 });
    reviewRun = workflows.advanceRun({ runId: reviewRun.id });
    reviewRun = workflows.advanceRun({ runId: reviewRun.id });
    reviewRun = workflows.advanceRun({ runId: reviewRun.id });
    reviewRun = workflows.advanceRun({ runId: reviewRun.id, testsPassed: true });
    reviewRun = workflows.advanceRun({ runId: reviewRun.id, reviewPassed: false });
    expect(reviewRun.currentStep).toBe("implement");
    expect(reviewRun.reviewIteration).toBe(1);

    reviewRun = workflows.advanceRun({ runId: reviewRun.id });
    reviewRun = workflows.advanceRun({ runId: reviewRun.id, testsPassed: true });
    reviewRun = workflows.advanceRun({ runId: reviewRun.id, reviewPassed: false });
    expect(reviewRun.status).toBe("failed");
    expect(reviewRun.failureReason).toBe("Maximum review iterations reached.");
  });
});
