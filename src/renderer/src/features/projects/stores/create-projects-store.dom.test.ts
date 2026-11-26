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
      chooseFolder: async () => "/home/me/dev/mabar-desktop",
      chooseFolders: async () => ["/home/me/dev/mabar-desktop", "/home/me/dev/mabar-backend"],
      searchFiles: async () => [],
    },
    worktrees: {
      create: async ({ repositoryId, branchName, baseRef }) => ({
        id: `worktree-${branchName}`,
        repositoryId,
        hostId: "local",
        taskId: null,
        branchName,
        baseRef: baseRef ?? null,
        canonicalPath: `/home/me/.openbot-worktrees/mabar-desktop/${branchName}`,
        managedByApplication: true,
        lifecycleStatus: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        archivedAt: null,
      }),
      listForRepository: async () => [],
      inspect: async ({ worktreeId }) => ({
        worktreeId,
        exists: true,
        isWorkingTree: true,
        currentBranch: "feat/test",
        dirty: false,
      }),
      refresh: async ({ worktreeId }) => ({
        id: worktreeId,
        repositoryId: "repo-1",
        hostId: "local",
        taskId: null,
        branchName: "feat/test",
        baseRef: null,
        canonicalPath: "/home/me/.openbot-worktrees/mabar-desktop/feat-test",
        managedByApplication: true,
        lifecycleStatus: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        archivedAt: null,
      }),
      remove: async () => {},
    },
    developmentTasks: {
      create: async ({
        projectId,
        repositoryId,
        parentTaskId,
        title,
        description,
        acceptanceCriteria,
        taskType,
        priority,
      }) => ({
        id: `task-${title}`,
        projectId,
        repositoryId: repositoryId ?? null,
        parentTaskId: parentTaskId ?? null,
        title,
        description: description ?? "",
        acceptanceCriteria: acceptanceCriteria ?? "",
        taskType: taskType ?? "feature",
        priority: priority ?? "p2",
        status: "backlog",
        assignedAgentId: null,
        worktreeId: null,
        externalIssueRef: null,
        externalPrRef: null,
        blockerReason: null,
        testEvidence: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        archivedAt: null,
      }),
      listForProject: async () => [],
      get: async () => null,
      update: async ({ taskId, status, testEvidence }) => ({
        id: taskId,
        projectId: "project-1",
        repositoryId: null,
        parentTaskId: null,
        title: "Task",
        description: "",
        acceptanceCriteria: "",
        taskType: "feature",
        priority: "p2",
        status: status ?? "backlog",
        assignedAgentId: null,
        worktreeId: null,
        externalIssueRef: null,
        externalPrRef: null,
        blockerReason: null,
        testEvidence: testEvidence ?? null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        archivedAt: null,
      }),
      archive: async () => {},
      addDependency: async () => {},
      removeDependency: async () => {},
      listDependencies: async () => [],
    },
    gitReview: {
      getSnapshot: async () => ({
        targetPath: "/home/me/dev/mabar-desktop",
        currentBranch: "main",
        files: [{ path: "src/app.ts", status: "modified", staged: false }],
        commits: [],
        hasConflicts: false,
      }),
      getDiff: async ({ filePath }) => ({
        diff: filePath ? `diff --git a/${filePath} b/${filePath}\n+updated` : "full diff",
        truncated: false,
        binary: false,
      }),
      getGitHubOverview: async () => ({
        owner: "yadenmustopa",
        repo: "ManageBot",
        issues: [],
        pullRequests: [],
        error: null,
      }),
      createPullRequest: async () => "https://github.com/yadenmustopa/ManageBot/pull/1",
    },
    codingWorkflows: {
      start: async () => {
        throw new Error("not used");
      },
      listForProject: async () => [],
      advance: async () => {
        throw new Error("not used");
      },
      cancel: async () => {
        throw new Error("not used");
      },
    },
    threadRepositoryScope: {
      getScope: async ({ threadId }) => ({ threadId, projectId: null, repositoryId: null, worktreeId: null }),
      setScope: async ({ threadId, projectId, repositoryId, worktreeId }) => ({
        threadId,
        projectId,
        repositoryId,
        worktreeId: worktreeId ?? null,
      }),
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

  it("strips Electron's IPC wrapping from a failed import, showing only the backend's message", async () => {
    const { port } = fakePort();
    port.repositories.importRepository = async () => {
      throw new Error("Error invoking remote method 'repositories:import': Error: This folder does not exist.");
    };
    const { store, dispose } = withStore(port);
    await store.load();
    await store.createProject({ name: "Mabar Desktop", description: "" });
    const ok = await store.importRepository("/does/not/exist");
    expect(ok).toBe(false);
    expect(store.state.error).toBe("This folder does not exist.");
    dispose();
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

  it("creates a worktree and requires explicit confirmation before force-removing a dirty worktree", async () => {
    const { port } = fakePort();
    const removeCalls: Array<{ worktreeId: string; force: boolean }> = [];
    port.worktrees.inspect = async ({ worktreeId }) => ({
      worktreeId,
      exists: true,
      isWorkingTree: true,
      currentBranch: "feat/dirty",
      dirty: true,
    });
    port.worktrees.remove = async ({ worktreeId, force }) => {
      removeCalls.push({ worktreeId, force: Boolean(force) });
    };

    const { store, dispose } = withStore(port);
    await store.load();
    await store.createProject({ name: "Mabar Desktop", description: "" });
    await store.importRepository("/home/me/dev/mabar-desktop");
    const repositoryId = store.state.repositories[0]?.id;
    if (!repositoryId) throw new Error("expected a repository id");

    const created = await store.createWorktree({ repositoryId, branchName: "feat/dirty", baseRef: "main" });
    expect(created).toBe(true);
    const worktree = store.state.worktreesByRepository[repositoryId]?.[0];
    expect(worktree?.branchName).toBe("feat/dirty");
    if (!worktree) throw new Error("expected a worktree");

    await store.removeWorktree(worktree);
    expect(removeCalls).toHaveLength(0);
    expect(store.state.dirtyWorktreeToRemove?.id).toBe(worktree.id);
    expect(store.state.worktreesByRepository[repositoryId]).toHaveLength(1);

    const confirmed = await store.confirmForceRemoveWorktree();
    expect(confirmed).toBe(true);
    expect(removeCalls).toEqual([{ worktreeId: worktree.id, force: true }]);
    expect(store.state.dirtyWorktreeToRemove).toBeNull();
    expect(store.state.worktreesByRepository[repositoryId]).toHaveLength(0);
    dispose();
  });

  it("creates, updates, and archives development tasks for the active project", async () => {
    const { port } = fakePort();
    const { store, dispose } = withStore(port);
    await store.load();
    await store.createProject({ name: "Mabar Desktop", description: "" });

    const created = await store.createTask({ title: "Build task board", description: "Kanban view" });
    expect(created).toBe(true);
    expect(store.state.tasks).toHaveLength(1);
    const taskId = store.state.tasks[0]?.id;
    if (!taskId) throw new Error("expected a task id");

    const updated = await store.updateTaskStatus(taskId, "done", "vitest passed");
    expect(updated).toBe(true);
    expect(store.state.tasks[0]?.status).toBe("done");

    await store.archiveTask(taskId);
    expect(store.state.tasks).toHaveLength(0);
    dispose();
  });

  it("loads Git review snapshot, file diff, and GitHub overview", async () => {
    const { port } = fakePort();
    const { store, dispose } = withStore(port);
    await store.load();
    await store.createProject({ name: "Mabar Desktop", description: "" });
    await store.importRepository("/home/me/dev/mabar-desktop");
    const repositoryId = store.state.repositories[0]?.id;
    if (!repositoryId) throw new Error("expected a repository id");

    await store.openReview(repositoryId);
    expect(store.state.reviewSnapshot?.files).toHaveLength(1);
    expect(store.state.reviewDiff?.diff).toBe("full diff");
    expect(store.state.reviewGitHub?.owner).toBe("yadenmustopa");

    await store.selectReviewFile("src/app.ts", false);
    expect(store.state.reviewDiff?.diff).toContain("src/app.ts");

    store.closeReview();
    await Promise.resolve();
    expect(store.state.reviewTarget).toBeNull();
    dispose();
  });

  it("creates a project with multiple selected repository folders", async () => {
    const { port } = fakePort();
    const { store, dispose } = withStore(port);
    await store.load();

    const ok = await store.createProject({
      name: "Multi Repo Project",
      description: "Two folders",
      repositoryPaths: ["/home/me/dev/mabar-desktop", "/home/me/dev/mabar-backend"],
    });
    expect(ok).toBe(true);
    expect(store.state.repositories).toHaveLength(2);
    expect(store.state.repositories.map((repo) => repo.canonicalPath)).toEqual([
      "/home/me/dev/mabar-desktop",
      "/home/me/dev/mabar-backend",
    ]);
    expect(store.state.dashboard?.repositoryCount).toBe(2);
    dispose();
  });
});
