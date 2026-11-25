import type { OpenBotProject, OpenBotRepository, OpenBotWorkspace } from "@openbot/contracts/project";
import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ProjectPort } from "../project-port";
import { createProjectsStore, type ProjectsStore } from "./create-projects-store";

function withStore(port: ProjectPort): { store: ProjectsStore; dispose: () => void } {
  return createRoot((dispose) => ({ store: createProjectsStore(() => port), dispose }));
}

function fakePort(): { port: ProjectPort; dispose: () => void } {
  const now = new Date().toISOString();
  const workspace: OpenBotWorkspace = {
    id: "workspace-1",
    name: "My Workspace",
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  const projects = new Map<string, OpenBotProject>();
  const repositories = new Map<string, OpenBotRepository>();
  const links: { projectId: string; repositoryId: string }[] = [];
  let projectCounter = 0;
  let repoCounter = 0;

  const port: ProjectPort = {
    projects: {
      ensureDefaultWorkspace: async () => workspace,
      listWorkspaces: async () => [workspace],
      listProjects: async () => [...projects.values()],
      getProject: async ({ projectId }) => projects.get(projectId) ?? null,
      createProject: async (input) => {
        projectCounter += 1;
        const project: OpenBotProject = {
          id: `project-${projectCounter}`,
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description ?? "",
          icon: input.icon ?? null,
          color: input.color ?? null,
          pinned: false,
          sortOrder: projects.size,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        };
        projects.set(project.id, project);
        return project;
      },
      updateProject: async (input) => {
        const current = projects.get(input.projectId);
        if (!current) throw new Error("not found");
        const next = { ...current, ...input };
        projects.set(next.id, next);
        return next;
      },
      archiveProject: async ({ projectId }) => {
        const project = projects.get(projectId);
        if (project) projects.set(projectId, { ...project, archivedAt: now });
      },
      restoreProject: async ({ projectId }) => {
        const project = projects.get(projectId);
        if (project) projects.set(projectId, { ...project, archivedAt: null });
      },
      getDashboardSummary: async ({ projectId }) => ({
        projectId,
        repositoryCount: links.filter((link) => link.projectId === projectId).length,
      }),
    },
    repositories: {
      importRepository: async ({ projectId, path }) => {
        repoCounter += 1;
        const repository: OpenBotRepository = {
          id: `repo-${repoCounter}`,
          hostId: "local",
          name: path.split("/").pop() ?? path,
          canonicalPath: path,
          remoteUrl: null,
          currentBranch: "main",
          defaultBranch: "main",
          dirty: false,
          health: "available",
          lastRefreshedAt: now,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        };
        repositories.set(repository.id, repository);
        links.push({ projectId, repositoryId: repository.id });
        return repository;
      },
      listForProject: async ({ projectId }) =>
        links
          .filter((link) => link.projectId === projectId)
          .map((link) => repositories.get(link.repositoryId))
          .filter((repository): repository is OpenBotRepository => repository !== undefined),
      refreshRepository: async ({ repositoryId }) => {
        const repository = repositories.get(repositoryId);
        if (!repository) throw new Error("not found");
        return repository;
      },
      detachRepository: async ({ projectId, repositoryId }) => {
        const index = links.findIndex((link) => link.projectId === projectId && link.repositoryId === repositoryId);
        if (index !== -1) links.splice(index, 1);
      },
    },
    threadRepositoryScope: {
      getScope: async ({ threadId }) => ({ threadId, projectId: null, repositoryId: null }),
      setScope: async ({ threadId, projectId, repositoryId }) => ({ threadId, projectId, repositoryId }),
    },
  };
  return { port, dispose: () => {} };
}

describe("createProjectsStore", () => {
  let localStorageBackup: Record<string, string>;

  beforeEach(() => {
    localStorageBackup = { ...window.localStorage };
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    for (const [key, value] of Object.entries(localStorageBackup)) window.localStorage.setItem(key, value);
  });

  it("loads the default workspace and its projects, selecting the first one", async () => {
    const { port } = fakePort();
    await port.projects.createProject({ workspaceId: "workspace-1", name: "Mabar Desktop" });
    const { store, dispose } = withStore(port);
    await store.load();
    expect(store.state.projects).toHaveLength(1);
    expect(store.state.activeProjectId).toBe(store.state.projects[0]?.id);
    dispose();
  });

  it("creates a project and makes it active", async () => {
    const { port } = fakePort();
    const { store, dispose } = withStore(port);
    await store.load();
    const ok = await store.createProject({ name: "Flow Automation", description: "" });
    expect(ok).toBe(true);
    expect(store.state.projects.map((project) => project.name)).toContain("Flow Automation");
    expect(store.state.projects.find((project) => project.name === "Flow Automation")?.id).toBe(
      store.state.activeProjectId,
    );
    dispose();
  });

  it("imports a repository into the active project and updates the dashboard count", async () => {
    const { port } = fakePort();
    const { store, dispose } = withStore(port);
    await store.load();
    await store.createProject({ name: "Mabar Desktop", description: "" });
    const ok = await store.importRepository("/home/me/dev/mabar-desktop");
    expect(ok).toBe(true);
    expect(store.state.repositories).toHaveLength(1);
    expect(store.state.repositories[0]?.canonicalPath).toBe("/home/me/dev/mabar-desktop");
    expect(store.state.dashboard?.repositoryCount).toBe(1);
    dispose();
  });

  it("remembers the active project across reloads of the same store", async () => {
    const { port } = fakePort();
    await port.projects.createProject({ workspaceId: "workspace-1", name: "A" });
    const second = await port.projects.createProject({ workspaceId: "workspace-1", name: "B" });
    const { store, dispose } = withStore(port);
    await store.load();
    store.selectProject(second.id);

    const { store: reloaded, dispose: disposeReloaded } = withStore(port);
    await reloaded.load();
    expect(reloaded.state.activeProjectId).toBe(second.id);
    dispose();
    disposeReloaded();
  });

  it("detaching a repository removes it from the project without affecting other projects", async () => {
    const { port } = fakePort();
    const { store, dispose } = withStore(port);
    await store.load();
    await store.createProject({ name: "Mabar Desktop", description: "" });
    await store.importRepository("/home/me/dev/mabar-desktop");
    const repositoryId = store.state.repositories[0]?.id;
    expect(repositoryId).toBeDefined();
    if (!repositoryId) throw new Error("expected a repository id");
    await store.detachRepository(repositoryId);
    expect(store.state.repositories).toHaveLength(0);
    expect(store.state.dashboard?.repositoryCount).toBe(0);
    dispose();
  });
});
