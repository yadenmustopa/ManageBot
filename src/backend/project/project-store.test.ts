// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCauseEffect } from "../effect-boundary";
import { OpenBotDatabase } from "../openbot-database";
import { ProjectError, ProjectStore } from "./project-store";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createStore(): Promise<ProjectStore> {
  const root = await mkdtemp(join(tmpdir(), "openbot-project-store-"));
  roots.push(root);
  const database = new OpenBotDatabase(root);
  await runCauseEffect(database.initialize());
  return new ProjectStore(database);
}

describe("ProjectStore", () => {
  it("creates one default workspace and reuses it on a second call", async () => {
    const store = await createStore();
    const first = store.ensureDefaultWorkspace();
    const second = store.ensureDefaultWorkspace();
    expect(second.id).toBe(first.id);
    expect(store.listWorkspaces()).toHaveLength(1);
  });

  it("creates a project in a workspace with an increasing sort order", async () => {
    const store = await createStore();
    const workspace = store.ensureDefaultWorkspace();
    const first = store.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const second = store.createProject({ workspaceId: workspace.id, name: "Mabar Backend" });
    expect(first.sortOrder).toBe(0);
    expect(second.sortOrder).toBe(1);
    expect(store.listProjects(workspace.id).map((project) => project.name)).toEqual(["Mabar Desktop", "Mabar Backend"]);
  });

  it("refuses a project for a workspace that does not exist", async () => {
    const store = await createStore();
    expect(() => store.createProject({ workspaceId: "workspace-missing", name: "Orphan" })).toThrow(ProjectError);
  });

  it("updates only the given fields and leaves the rest alone", async () => {
    const store = await createStore();
    const workspace = store.ensureDefaultWorkspace();
    const project = store.createProject({ workspaceId: workspace.id, name: "Mabar Desktop", description: "Original" });
    const updated = store.updateProject({ projectId: project.id, pinned: true });
    expect(updated.name).toBe("Mabar Desktop");
    expect(updated.description).toBe("Original");
    expect(updated.pinned).toBe(true);
  });

  it("archives and restores a project without losing it from storage", async () => {
    const store = await createStore();
    const workspace = store.ensureDefaultWorkspace();
    const project = store.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    store.archiveProject(project.id);
    expect(store.listProjects(workspace.id)).toHaveLength(0);
    expect(store.listProjects(workspace.id, { includeArchived: true })).toHaveLength(1);
    expect(store.getProject(project.id)?.archivedAt).not.toBeNull();
    store.restoreProject(project.id);
    expect(store.getProject(project.id)?.archivedAt).toBeNull();
    expect(store.listProjects(workspace.id)).toHaveLength(1);
  });

  it("reorders projects within a workspace", async () => {
    const store = await createStore();
    const workspace = store.ensureDefaultWorkspace();
    const first = store.createProject({ workspaceId: workspace.id, name: "A" });
    const second = store.createProject({ workspaceId: workspace.id, name: "B" });
    store.reorderProjects(workspace.id, [second.id, first.id]);
    expect(store.listProjects(workspace.id).map((project) => project.name)).toEqual(["B", "A"]);
  });

  it("refuses to update, archive or restore a project that does not exist", async () => {
    const store = await createStore();
    expect(() => store.updateProject({ projectId: "project-missing", name: "Anything" })).toThrow(ProjectError);
    expect(() => store.archiveProject("project-missing")).toThrow(ProjectError);
    expect(() => store.restoreProject("project-missing")).toThrow(ProjectError);
  });
});
