// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCauseEffect } from "../effect-boundary";
import { OpenBotDatabase } from "../openbot-database";
import { DevelopmentTaskError, DevelopmentTaskStore } from "./development-task-store";
import { ProjectStore } from "./project-store";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createStores(): Promise<{ projects: ProjectStore; tasks: DevelopmentTaskStore }> {
  const root = await mkdtemp(join(tmpdir(), "openbot-dev-task-store-"));
  roots.push(root);
  const database = new OpenBotDatabase(root);
  await runCauseEffect(database.initialize());
  return { projects: new ProjectStore(database), tasks: new DevelopmentTaskStore(database) };
}

describe("DevelopmentTaskStore", () => {
  it("creates, updates, and archives a development task", async () => {
    const { projects, tasks } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });

    const created = tasks.createTask({
      projectId: project.id,
      title: "Add Kanban board",
      taskType: "feature",
      priority: "p1",
    });

    expect(created.status).toBe("backlog");
    expect(created.priority).toBe("p1");
    expect(tasks.listTasksForProject(project.id)).toHaveLength(1);

    const updated = tasks.updateTask({
      taskId: created.id,
      status: "in-progress",
      acceptanceCriteria: "Board renders all columns.",
    });
    expect(updated.status).toBe("in-progress");
    expect(updated.acceptanceCriteria).toBe("Board renders all columns.");

    tasks.archiveTask(created.id);
    expect(tasks.listTasksForProject(project.id)).toHaveLength(0);
    expect(tasks.listTasksForProject(project.id, true)).toHaveLength(1);
  });

  it("refuses marking a coding task done without test evidence, but allows research tasks", async () => {
    const { projects, tasks } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });

    const codingTask = tasks.createTask({ projectId: project.id, title: "Fix crash", taskType: "bug" });
    expect(() => tasks.updateTask({ taskId: codingTask.id, status: "done" })).toThrow(DevelopmentTaskError);

    const completedCoding = tasks.updateTask({
      taskId: codingTask.id,
      status: "done",
      testEvidence: "vitest run: 5 passed",
    });
    expect(completedCoding.status).toBe("done");
    expect(completedCoding.completedAt).not.toBeNull();

    const reopened = tasks.updateTask({ taskId: codingTask.id, status: "in-progress" });
    expect(reopened.completedAt).toBeNull();

    const researchTask = tasks.createTask({ projectId: project.id, title: "Audit API", taskType: "research" });
    const completedResearch = tasks.updateTask({ taskId: researchTask.id, status: "done" });
    expect(completedResearch.status).toBe("done");
  });

  it("manages task dependencies and rejects dependency cycles", async () => {
    const { projects, tasks } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });

    const taskA = tasks.createTask({ projectId: project.id, title: "Task A" });
    const taskB = tasks.createTask({ projectId: project.id, title: "Task B" });
    const taskC = tasks.createTask({ projectId: project.id, title: "Task C" });

    tasks.addDependency(taskB.id, taskA.id);
    tasks.addDependency(taskC.id, taskB.id);
    expect(tasks.listDependencies(taskC.id)).toEqual([taskB.id]);

    expect(() => tasks.addDependency(taskA.id, taskA.id)).toThrow(DevelopmentTaskError);
    expect(() => tasks.addDependency(taskA.id, taskC.id)).toThrow(DevelopmentTaskError);

    tasks.removeDependency(taskC.id, taskB.id);
    expect(tasks.listDependencies(taskC.id)).toEqual([]);
  });
});
