import type {
  CodingWorkflowsDesktopApi,
  DevelopmentTasksDesktopApi,
  GitReviewDesktopApi,
  ProjectsDesktopApi,
  RepositoriesDesktopApi,
  ThreadRepositoryScopeDesktopApi,
  WorktreesDesktopApi,
} from "@openbot/contracts/ipc";
import {
  type CreateDevelopmentTaskInput,
  type CreateProjectInput,
  type CreateWorktreeInput,
  createDevelopmentTaskId,
  createProjectId,
  createRepositoryId,
  createWorkspaceId,
  createWorktreeId,
  type DetachRepositoryInput,
  type DevelopmentTaskDependencyInput,
  type DevelopmentTaskIdInput,
  type ImportRepositoryInput,
  LOCAL_HOST_ID,
  type OpenBotDevelopmentTask,
  type OpenBotProject,
  type OpenBotRepository,
  type OpenBotWorkspace,
  type OpenBotWorktree,
  type ProjectIdInput,
  type RemoveWorktreeInput,
  type RepositoryIdInput,
  type SetThreadRepositoryScopeInput,
  type ThreadIdInput,
  type UpdateDevelopmentTaskInput,
  type UpdateProjectInput,
  type WorktreeIdInput,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";

function folderName(path: string): string {
  const parts = path.split("/").filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? path;
}

function seedWorkspace(): OpenBotWorkspace {
  const now = new Date("2026-11-20T09:00:00.000Z").toISOString();
  return { id: createWorkspaceId(), name: "My Workspace", createdAt: now, updatedAt: now, archivedAt: null };
}

function seedProjects(workspaceId: string): OpenBotProject[] {
  const now = new Date("2026-11-21T09:00:00.000Z").toISOString();
  return [
    {
      id: createProjectId(),
      workspaceId,
      name: "Mabar Desktop",
      description: "The Electron desktop app for the Mabar ecosystem.",
      icon: null,
      color: "blue",
      pinned: true,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    },
    {
      id: createProjectId(),
      workspaceId,
      name: "Flow Automation",
      description: "",
      icon: null,
      color: "violet",
      pinned: false,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    },
  ];
}

function seedRepositories(projectId: string): { repository: OpenBotRepository; projectId: string }[] {
  const now = new Date("2026-11-22T09:00:00.000Z").toISOString();
  const repository: OpenBotRepository = {
    id: createRepositoryId(),
    hostId: LOCAL_HOST_ID,
    name: "mabar-desktop",
    canonicalPath: "/home/sam/dev/mabar-desktop",
    remoteUrl: "git@github.com:bharatacorp/mabar-desktop.git",
    currentBranch: "main",
    defaultBranch: "main",
    dirty: false,
    health: "available",
    lastRefreshedAt: now,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  return [{ repository, projectId }];
}

/**
 * In-memory preview implementation of the `projects` and `repositories` IPC groups (OpenBot Dev
 * Workspace Phase 1). This is the Storybook/preview product surface, not a test double, so it
 * seeds real-looking data rather than returning empty lists (see `src/renderer/AGENTS.md`).
 */
export function createMockProjectWorkspace(): {
  projects: ProjectsDesktopApi;
  repositories: RepositoriesDesktopApi;
  worktrees: WorktreesDesktopApi;
  developmentTasks: DevelopmentTasksDesktopApi;
  gitReview: GitReviewDesktopApi;
  codingWorkflows: CodingWorkflowsDesktopApi;
  threadRepositoryScope: ThreadRepositoryScopeDesktopApi;
} {
  const workspace = seedWorkspace();
  const projects = new Map<string, OpenBotProject>(seedProjects(workspace.id).map((project) => [project.id, project]));
  const repositories = new Map<string, OpenBotRepository>();
  const links: { projectId: string; repositoryId: string }[] = [];
  for (const [projectId, project] of projects) {
    if (project.name !== "Mabar Desktop") continue;
    for (const seed of seedRepositories(projectId)) {
      repositories.set(seed.repository.id, seed.repository);
      links.push({ projectId: seed.projectId, repositoryId: seed.repository.id });
    }
  }

  function requireProject(projectId: string): OpenBotProject {
    const project = projects.get(projectId);
    if (!project) throw new Error(sourceText("error.backend.projectGone"));
    return project;
  }

  const projectsApi: ProjectsDesktopApi = {
    ensureDefaultWorkspace: async () => structuredClone(workspace),
    listWorkspaces: async () => [structuredClone(workspace)],
    listProjects: async () => [...projects.values()].filter((project) => !project.archivedAt),
    getProject: async ({ projectId }: ProjectIdInput) =>
      projects.has(projectId) ? structuredClone(requireProject(projectId)) : null,
    createProject: async (input: CreateProjectInput) => {
      const now = new Date().toISOString();
      const project: OpenBotProject = {
        id: createProjectId(),
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
      return structuredClone(project);
    },
    updateProject: async (input: UpdateProjectInput) => {
      const current = requireProject(input.projectId);
      const next: OpenBotProject = {
        ...current,
        name: input.name ?? current.name,
        description: input.description ?? current.description,
        icon: input.icon === undefined ? current.icon : input.icon,
        color: input.color === undefined ? current.color : input.color,
        pinned: input.pinned ?? current.pinned,
        updatedAt: new Date().toISOString(),
      };
      projects.set(next.id, next);
      return structuredClone(next);
    },
    archiveProject: async ({ projectId }: ProjectIdInput) => {
      const project = requireProject(projectId);
      projects.set(projectId, { ...project, archivedAt: new Date().toISOString() });
    },
    restoreProject: async ({ projectId }: ProjectIdInput) => {
      const project = requireProject(projectId);
      projects.set(projectId, { ...project, archivedAt: null });
    },
    getDashboardSummary: async ({ projectId }: ProjectIdInput) => ({
      projectId,
      repositoryCount: links.filter((link) => link.projectId === projectId).length,
    }),
  };

  const repositoriesApi: RepositoriesDesktopApi = {
    importRepository: async ({ projectId, path }: ImportRepositoryInput) => {
      requireProject(projectId);
      const now = new Date().toISOString();
      const repository: OpenBotRepository = {
        id: createRepositoryId(),
        hostId: LOCAL_HOST_ID,
        name: folderName(path),
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
      return structuredClone(repository);
    },
    listForProject: async ({ projectId }: ProjectIdInput) =>
      links
        .filter((link) => link.projectId === projectId)
        .map((link) => repositories.get(link.repositoryId))
        .filter((repository): repository is OpenBotRepository => repository !== undefined)
        .map((repository) => structuredClone(repository)),
    refreshRepository: async ({ repositoryId }: RepositoryIdInput) => {
      const repository = repositories.get(repositoryId);
      if (!repository) throw new Error(sourceText("error.backend.repositoryGone"));
      const refreshed = { ...repository, lastRefreshedAt: new Date().toISOString() };
      repositories.set(repositoryId, refreshed);
      return structuredClone(refreshed);
    },
    detachRepository: async ({ projectId, repositoryId }: DetachRepositoryInput) => {
      const index = links.findIndex((link) => link.projectId === projectId && link.repositoryId === repositoryId);
      if (index !== -1) links.splice(index, 1);
    },
    chooseFolder: async () => "/home/sam/dev/mabar-backend",
  };

  const worktrees = new Map<string, OpenBotWorktree>();

  function requireWorktree(worktreeId: string): OpenBotWorktree {
    const worktree = worktrees.get(worktreeId);
    if (!worktree) throw new Error(sourceText("error.backend.worktreeGone"));
    return worktree;
  }

  const worktreesApi: WorktreesDesktopApi = {
    create: async ({ repositoryId, branchName, baseRef }: CreateWorktreeInput) => {
      const repository = repositories.get(repositoryId);
      if (!repository) throw new Error(sourceText("error.backend.repositoryGone"));
      const now = new Date().toISOString();
      const slug = branchName.trim().replace(/[^A-Za-z0-9._-]+/g, "-");
      const worktree: OpenBotWorktree = {
        id: createWorktreeId(),
        repositoryId,
        hostId: LOCAL_HOST_ID,
        taskId: null,
        branchName: branchName.trim(),
        baseRef: baseRef ?? null,
        canonicalPath: `${repository.canonicalPath}/../.openbot-worktrees/${repository.name}/${slug}`,
        managedByApplication: true,
        lifecycleStatus: "active",
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      worktrees.set(worktree.id, worktree);
      return structuredClone(worktree);
    },
    listForRepository: async ({ repositoryId }: RepositoryIdInput) =>
      [...worktrees.values()]
        .filter((worktree) => worktree.repositoryId === repositoryId)
        .map((worktree) => structuredClone(worktree)),
    inspect: async ({ worktreeId }: WorktreeIdInput) => {
      const worktree = requireWorktree(worktreeId);
      return { worktreeId, exists: true, isWorkingTree: true, currentBranch: worktree.branchName, dirty: false };
    },
    refresh: async ({ worktreeId }: WorktreeIdInput) => structuredClone(requireWorktree(worktreeId)),
    remove: async ({ worktreeId }: RemoveWorktreeInput) => {
      requireWorktree(worktreeId);
      worktrees.delete(worktreeId);
    },
  };

  const threadScopes = new Map<
    string,
    { projectId: string | null; repositoryId: string | null; worktreeId: string | null }
  >();
  const threadRepositoryScopeApi: ThreadRepositoryScopeDesktopApi = {
    getScope: async ({ threadId }: ThreadIdInput) => {
      const scope = threadScopes.get(threadId) ?? { projectId: null, repositoryId: null, worktreeId: null };
      return { threadId, ...scope };
    },
    setScope: async ({ threadId, projectId, repositoryId, worktreeId }: SetThreadRepositoryScopeInput) => {
      const resolvedWorktreeId = worktreeId ?? null;
      threadScopes.set(threadId, { projectId, repositoryId, worktreeId: resolvedWorktreeId });
      return { threadId, projectId, repositoryId, worktreeId: resolvedWorktreeId };
    },
  };

  const devTasks = new Map<string, OpenBotDevelopmentTask>();
  const devTaskDeps = new Map<string, Set<string>>();

  const developmentTasksApi: DevelopmentTasksDesktopApi = {
    create: async (input: CreateDevelopmentTaskInput) => {
      const now = new Date().toISOString();
      const task: OpenBotDevelopmentTask = {
        id: createDevelopmentTaskId(),
        projectId: input.projectId,
        repositoryId: input.repositoryId ?? null,
        parentTaskId: input.parentTaskId ?? null,
        title: input.title.trim(),
        description: input.description ?? "",
        acceptanceCriteria: input.acceptanceCriteria ?? "",
        taskType: input.taskType ?? "feature",
        priority: input.priority ?? "p2",
        status: "backlog",
        assignedAgentId: null,
        worktreeId: null,
        externalIssueRef: null,
        externalPrRef: null,
        blockerReason: null,
        testEvidence: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        archivedAt: null,
      };
      devTasks.set(task.id, task);
      return structuredClone(task);
    },
    listForProject: async ({ projectId }: ProjectIdInput) =>
      [...devTasks.values()]
        .filter((task) => task.projectId === projectId && task.archivedAt === null)
        .map((task) => structuredClone(task)),
    get: async ({ taskId }: DevelopmentTaskIdInput) => {
      const task = devTasks.get(taskId);
      return task ? structuredClone(task) : null;
    },
    update: async (input: UpdateDevelopmentTaskInput) => {
      const current = devTasks.get(input.taskId);
      if (!current) throw new Error(sourceText("error.backend.taskGone"));
      const now = new Date().toISOString();
      const next: OpenBotDevelopmentTask = {
        ...current,
        title: input.title !== undefined ? input.title.trim() : current.title,
        description: input.description !== undefined ? input.description : current.description,
        acceptanceCriteria:
          input.acceptanceCriteria !== undefined ? input.acceptanceCriteria : current.acceptanceCriteria,
        taskType: input.taskType ?? current.taskType,
        priority: input.priority ?? current.priority,
        status: input.status ?? current.status,
        assignedAgentId: input.assignedAgentId !== undefined ? input.assignedAgentId : current.assignedAgentId,
        worktreeId: input.worktreeId !== undefined ? input.worktreeId : current.worktreeId,
        externalIssueRef: input.externalIssueRef !== undefined ? input.externalIssueRef : current.externalIssueRef,
        externalPrRef: input.externalPrRef !== undefined ? input.externalPrRef : current.externalPrRef,
        blockerReason: input.blockerReason !== undefined ? input.blockerReason : current.blockerReason,
        testEvidence: input.testEvidence !== undefined ? input.testEvidence : current.testEvidence,
        updatedAt: now,
        completedAt: input.status === "done" ? (current.completedAt ?? now) : input.status ? null : current.completedAt,
      };
      devTasks.set(next.id, next);
      return structuredClone(next);
    },
    archive: async ({ taskId }: DevelopmentTaskIdInput) => {
      const current = devTasks.get(taskId);
      if (!current) throw new Error(sourceText("error.backend.taskGone"));
      current.archivedAt = new Date().toISOString();
    },
    addDependency: async ({ taskId, dependsOnTaskId }: DevelopmentTaskDependencyInput) => {
      const deps = devTaskDeps.get(taskId) ?? new Set<string>();
      deps.add(dependsOnTaskId);
      devTaskDeps.set(taskId, deps);
    },
    removeDependency: async ({ taskId, dependsOnTaskId }: DevelopmentTaskDependencyInput) => {
      devTaskDeps.get(taskId)?.delete(dependsOnTaskId);
    },
    listDependencies: async ({ taskId }: DevelopmentTaskIdInput) => [...(devTaskDeps.get(taskId) ?? [])],
  };

  const gitReviewApi: GitReviewDesktopApi = {
    getSnapshot: async ({ repositoryId }) => {
      const repository = repositories.get(repositoryId);
      return {
        targetPath: repository?.canonicalPath ?? "",
        currentBranch: repository?.currentBranch ?? "main",
        files: [],
        commits: [],
        hasConflicts: false,
      };
    },
    getDiff: async () => ({ diff: "", truncated: false, binary: false }),
    getGitHubOverview: async () => ({ owner: "", repo: "", issues: [], pullRequests: [], error: null }),
    createPullRequest: async () => "https://github.com/example/repo/pull/1",
  };

  const codingWorkflowsApi: CodingWorkflowsDesktopApi = {
    start: async ({ taskId }) => ({
      id: "wf-run-1",
      taskId,
      projectId: "project-1",
      repositoryId: "repo-1",
      worktreeId: null,
      currentStep: "plan",
      status: "running",
      reviewIteration: 0,
      maxReviewIterations: 3,
      logs: [],
      failureReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    listForProject: async () => [],
    advance: async ({ runId }) => ({
      id: runId,
      taskId: "task-1",
      projectId: "project-1",
      repositoryId: "repo-1",
      worktreeId: null,
      currentStep: "approval",
      status: "awaiting-approval",
      reviewIteration: 0,
      maxReviewIterations: 3,
      logs: [],
      failureReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    cancel: async ({ runId }) => ({
      id: runId,
      taskId: "task-1",
      projectId: "project-1",
      repositoryId: "repo-1",
      worktreeId: null,
      currentStep: "plan",
      status: "cancelled",
      reviewIteration: 0,
      maxReviewIterations: 3,
      logs: [],
      failureReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  };

  return {
    projects: projectsApi,
    repositories: repositoriesApi,
    worktrees: worktreesApi,
    developmentTasks: developmentTasksApi,
    gitReview: gitReviewApi,
    codingWorkflows: codingWorkflowsApi,
    threadRepositoryScope: threadRepositoryScopeApi,
  };
}
