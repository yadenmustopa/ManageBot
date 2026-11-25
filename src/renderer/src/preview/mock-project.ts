import type {
  ProjectsDesktopApi,
  RepositoriesDesktopApi,
  ThreadRepositoryScopeDesktopApi,
} from "@openbot/contracts/ipc";
import {
  type CreateProjectInput,
  createProjectId,
  createRepositoryId,
  createWorkspaceId,
  type DetachRepositoryInput,
  type ImportRepositoryInput,
  LOCAL_HOST_ID,
  type OpenBotProject,
  type OpenBotRepository,
  type OpenBotWorkspace,
  type ProjectIdInput,
  type RepositoryIdInput,
  type SetThreadRepositoryScopeInput,
  type ThreadIdInput,
  type UpdateProjectInput,
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
  };

  const threadScopes = new Map<string, { projectId: string | null; repositoryId: string | null }>();
  const threadRepositoryScopeApi: ThreadRepositoryScopeDesktopApi = {
    getScope: async ({ threadId }: ThreadIdInput) => {
      const scope = threadScopes.get(threadId) ?? { projectId: null, repositoryId: null };
      return { threadId, ...scope };
    },
    setScope: async ({ threadId, projectId, repositoryId }: SetThreadRepositoryScopeInput) => {
      threadScopes.set(threadId, { projectId, repositoryId });
      return { threadId, projectId, repositoryId };
    },
  };

  return { projects: projectsApi, repositories: repositoriesApi, threadRepositoryScope: threadRepositoryScopeApi };
}
