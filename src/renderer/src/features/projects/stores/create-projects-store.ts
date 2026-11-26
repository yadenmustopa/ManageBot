import type {
  DevelopmentTaskStatus,
  GitDiffResult,
  GitHubRepositoryOverview,
  GitReviewSnapshot,
  OpenBotDevelopmentTask,
  OpenBotProject,
  OpenBotRepository,
  OpenBotWorktree,
  ProjectDashboardSummary,
} from "@openbot/contracts/project";
import { createStore } from "solid-js";
import type { ProjectPort } from "../project-port";
import { readActiveProjectId, writeActiveProjectId } from "../project-selection-storage";

export interface ProjectsState {
  workspaceId: string | null;
  projects: OpenBotProject[];
  activeProjectId: string | null;
  repositories: OpenBotRepository[];
  worktreesByRepository: Record<string, OpenBotWorktree[]>;
  tasks: OpenBotDevelopmentTask[];
  dashboard: ProjectDashboardSummary | null;
  loading: boolean;
  error: string | null;
  pending: boolean;
  createOpen: boolean;
  importOpen: boolean;
  createTaskOpen: boolean;
  createWorktreeRepositoryId: string | null;
  dirtyWorktreeToRemove: OpenBotWorktree | null;
  reviewTarget: { repositoryId: string; worktreeId: string | null } | null;
  reviewSnapshot: GitReviewSnapshot | null;
  reviewDiff: GitDiffResult | null;
  reviewGitHub: GitHubRepositoryOverview | null;
}

const ELECTRON_IPC_ERROR_PREFIX = /^Error invoking remote method '[^']*':\s*(?:[A-Za-z]*Error:\s*)?/;

function errorMessage(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : String(cause);
  return raw.replace(ELECTRON_IPC_ERROR_PREFIX, "");
}

export function createProjectsStore(port: () => ProjectPort) {
  const [state, setState] = createStore<ProjectsState>({
    workspaceId: null,
    projects: [],
    activeProjectId: null,
    repositories: [],
    worktreesByRepository: {},
    tasks: [],
    dashboard: null,
    loading: false,
    error: null,
    pending: false,
    createOpen: false,
    importOpen: false,
    createTaskOpen: false,
    createWorktreeRepositoryId: null,
    dirtyWorktreeToRemove: null,
    reviewTarget: null,
    reviewSnapshot: null,
    reviewDiff: null,
    reviewGitHub: null,
  });

  let repositoryLoadToken = 0;

  async function loadRepositories(projectId: string, token: number) {
    const [repositories, dashboard, tasks] = await Promise.all([
      port().repositories.listForProject({ projectId }),
      port().projects.getDashboardSummary({ projectId }),
      port().developmentTasks.listForProject({ projectId }),
    ]);
    const worktreeEntries =
      repositories.length === 0
        ? []
        : await Promise.all(
            repositories.map(
              async (repository) =>
                [repository.id, await port().worktrees.listForRepository({ repositoryId: repository.id })] as const,
            ),
          );
    setState((draft) => {
      if (draft.activeProjectId !== projectId || token !== repositoryLoadToken) return;
      draft.repositories = repositories;
      draft.worktreesByRepository = Object.fromEntries(worktreeEntries);
      draft.tasks = tasks;
      draft.dashboard = dashboard;
    });
  }

  function selectProject(projectId: string | null) {
    const token = ++repositoryLoadToken;
    setState((draft) => {
      draft.activeProjectId = projectId;
      draft.repositories = [];
      draft.worktreesByRepository = {};
      draft.tasks = [];
      draft.dashboard = null;
    });
    writeActiveProjectId(projectId);
    if (projectId) void loadRepositories(projectId, token);
  }

  async function load(): Promise<void> {
    setState((draft) => {
      draft.loading = true;
      draft.error = null;
    });
    try {
      const workspace = await port().projects.ensureDefaultWorkspace();
      const projects = await port().projects.listProjects({ workspaceId: workspace.id });
      const remembered = readActiveProjectId();
      const initial = projects.find((project) => project.id === remembered)?.id ?? projects[0]?.id ?? null;
      setState((draft) => {
        draft.workspaceId = workspace.id;
        draft.projects = projects;
        draft.loading = false;
      });
      selectProject(initial);
    } catch (cause) {
      setState((draft) => {
        draft.loading = false;
        draft.error = errorMessage(cause);
      });
    }
  }

  async function createProject(input: {
    name: string;
    description: string;
    repositoryPaths?: string[];
  }): Promise<boolean> {
    const workspaceId = state.workspaceId;
    if (!workspaceId) return false;
    setState((draft) => {
      draft.pending = true;
      draft.error = null;
    });
    try {
      const project = await port().projects.createProject({
        workspaceId,
        name: input.name,
        description: input.description,
      });
      const uniquePaths = [...new Set((input.repositoryPaths ?? []).map((p) => p.trim()).filter(Boolean))];
      const imported: OpenBotRepository[] = [];
      for (const path of uniquePaths) {
        imported.push(await port().repositories.importRepository({ projectId: project.id, path }));
      }
      setState((draft) => {
        draft.projects = [...draft.projects, project];
        draft.pending = false;
        draft.createOpen = false;
      });
      selectProject(project.id);
      if (imported.length > 0) {
        setState((draft) => {
          if (draft.activeProjectId !== project.id) return;
          ++repositoryLoadToken;
          draft.repositories = imported;
          draft.worktreesByRepository = Object.fromEntries(imported.map((repo) => [repo.id, []]));
          draft.dashboard = { projectId: project.id, repositoryCount: imported.length };
        });
      }
      return true;
    } catch (cause) {
      setState((draft) => {
        draft.pending = false;
        draft.error = errorMessage(cause);
      });
      return false;
    }
  }

  async function importRepository(path: string): Promise<boolean> {
    const projectId = state.activeProjectId;
    if (!projectId) return false;
    setState((draft) => {
      draft.pending = true;
      draft.error = null;
    });
    try {
      const repository = await port().repositories.importRepository({ projectId, path });
      setState((draft) => {
        if (draft.activeProjectId !== projectId) return;
        ++repositoryLoadToken;
        draft.repositories = [...draft.repositories, repository];
        draft.worktreesByRepository[repository.id] = [];
        draft.dashboard = draft.dashboard
          ? { ...draft.dashboard, repositoryCount: draft.dashboard.repositoryCount + 1 }
          : { projectId, repositoryCount: draft.repositories.length };
        draft.pending = false;
        draft.importOpen = false;
      });
      return true;
    } catch (cause) {
      setState((draft) => {
        draft.pending = false;
        draft.error = errorMessage(cause);
      });
      return false;
    }
  }

  async function detachRepository(repositoryId: string): Promise<void> {
    const projectId = state.activeProjectId;
    if (!projectId) return;
    try {
      await port().repositories.detachRepository({ projectId, repositoryId });
      setState((draft) => {
        if (draft.activeProjectId !== projectId) return;
        ++repositoryLoadToken;
        draft.repositories = draft.repositories.filter((repository) => repository.id !== repositoryId);
        delete draft.worktreesByRepository[repositoryId];
        draft.dashboard = draft.dashboard
          ? { ...draft.dashboard, repositoryCount: Math.max(0, draft.dashboard.repositoryCount - 1) }
          : { projectId, repositoryCount: draft.repositories.length };
      });
    } catch (cause) {
      setState((draft) => {
        draft.error = errorMessage(cause);
      });
    }
  }

  async function refreshRepository(repositoryId: string): Promise<void> {
    try {
      const refreshed = await port().repositories.refreshRepository({ repositoryId });
      const worktrees = await port().worktrees.listForRepository({ repositoryId });
      setState((draft) => {
        draft.repositories = draft.repositories.map((repository) =>
          repository.id === repositoryId ? refreshed : repository,
        );
        draft.worktreesByRepository[repositoryId] = worktrees;
      });
    } catch (cause) {
      setState((draft) => {
        draft.error = errorMessage(cause);
      });
    }
  }

  async function createWorktree(input: {
    repositoryId: string;
    branchName: string;
    baseRef: string | null;
  }): Promise<boolean> {
    setState((draft) => {
      draft.pending = true;
      draft.error = null;
    });
    try {
      const worktree = await port().worktrees.create({
        repositoryId: input.repositoryId,
        branchName: input.branchName,
        baseRef: input.baseRef,
      });
      setState((draft) => {
        const existing = draft.worktreesByRepository[input.repositoryId] ?? [];
        draft.worktreesByRepository[input.repositoryId] = [...existing, worktree];
        draft.pending = false;
        draft.createWorktreeRepositoryId = null;
      });
      return true;
    } catch (cause) {
      setState((draft) => {
        draft.pending = false;
        draft.error = errorMessage(cause);
      });
      return false;
    }
  }

  async function refreshWorktree(worktreeId: string): Promise<void> {
    try {
      const refreshed = await port().worktrees.refresh({ worktreeId });
      setState((draft) => {
        const list = draft.worktreesByRepository[refreshed.repositoryId] ?? [];
        draft.worktreesByRepository[refreshed.repositoryId] = list.map((item) =>
          item.id === worktreeId ? refreshed : item,
        );
      });
    } catch (cause) {
      setState((draft) => {
        draft.error = errorMessage(cause);
      });
    }
  }

  async function removeWorktree(worktree: OpenBotWorktree): Promise<void> {
    setState((draft) => {
      draft.error = null;
    });
    try {
      const status = await port().worktrees.inspect({ worktreeId: worktree.id });
      if (status.exists && status.dirty) {
        setState((draft) => {
          draft.dirtyWorktreeToRemove = worktree;
        });
        return;
      }
      await port().worktrees.remove({ worktreeId: worktree.id, force: false });
      setState((draft) => {
        const list = draft.worktreesByRepository[worktree.repositoryId] ?? [];
        draft.worktreesByRepository[worktree.repositoryId] = list.filter((item) => item.id !== worktree.id);
      });
    } catch (cause) {
      setState((draft) => {
        draft.error = errorMessage(cause);
      });
    }
  }

  async function confirmForceRemoveWorktree(): Promise<boolean> {
    const target = state.dirtyWorktreeToRemove;
    if (!target) return false;
    setState((draft) => {
      draft.pending = true;
      draft.error = null;
    });
    try {
      await port().worktrees.remove({ worktreeId: target.id, force: true });
      setState((draft) => {
        const list = draft.worktreesByRepository[target.repositoryId] ?? [];
        draft.worktreesByRepository[target.repositoryId] = list.filter((item) => item.id !== target.id);
        draft.pending = false;
        draft.dirtyWorktreeToRemove = null;
      });
      return true;
    } catch (cause) {
      setState((draft) => {
        draft.pending = false;
        draft.error = errorMessage(cause);
      });
      return false;
    }
  }

  async function createTask(input: {
    title: string;
    description?: string;
    acceptanceCriteria?: string;
    repositoryId?: string | null;
  }): Promise<boolean> {
    const projectId = state.activeProjectId;
    if (!projectId) return false;
    setState((draft) => {
      draft.pending = true;
      draft.error = null;
    });
    try {
      const task = await port().developmentTasks.create({
        projectId,
        repositoryId: input.repositoryId ?? null,
        title: input.title,
        description: input.description,
        acceptanceCriteria: input.acceptanceCriteria,
      });
      setState((draft) => {
        if (draft.activeProjectId !== projectId) return;
        ++repositoryLoadToken;
        draft.tasks = [...draft.tasks, task];
        draft.pending = false;
        draft.createTaskOpen = false;
      });
      return true;
    } catch (cause) {
      setState((draft) => {
        draft.pending = false;
        draft.error = errorMessage(cause);
      });
      return false;
    }
  }

  async function updateTaskStatus(
    taskId: string,
    status: DevelopmentTaskStatus,
    testEvidence?: string | null,
  ): Promise<boolean> {
    setState((draft) => {
      draft.error = null;
    });
    try {
      const updated = await port().developmentTasks.update({ taskId, status, testEvidence });
      setState((draft) => {
        draft.tasks = draft.tasks.map((task) => (task.id === taskId ? updated : task));
      });
      return true;
    } catch (cause) {
      setState((draft) => {
        draft.error = errorMessage(cause);
      });
      return false;
    }
  }

  async function archiveTask(taskId: string): Promise<void> {
    try {
      await port().developmentTasks.archive({ taskId });
      setState((draft) => {
        draft.tasks = draft.tasks.filter((task) => task.id !== taskId);
      });
    } catch (cause) {
      setState((draft) => {
        draft.error = errorMessage(cause);
      });
    }
  }

  async function openReview(repositoryId: string, worktreeId: string | null = null): Promise<void> {
    setState((draft) => {
      draft.reviewTarget = { repositoryId, worktreeId };
      draft.reviewSnapshot = null;
      draft.reviewDiff = null;
      draft.reviewGitHub = null;
      draft.error = null;
    });
    try {
      const [snapshot, diff, github] = await Promise.all([
        port().gitReview.getSnapshot({ repositoryId, worktreeId }),
        port().gitReview.getDiff({ repositoryId, worktreeId }),
        port().gitReview.getGitHubOverview({ repositoryId }),
      ]);
      setState((draft) => {
        if (draft.reviewTarget?.repositoryId !== repositoryId || draft.reviewTarget?.worktreeId !== worktreeId) return;
        draft.reviewSnapshot = snapshot;
        draft.reviewDiff = diff;
        draft.reviewGitHub = github;
      });
    } catch (cause) {
      setState((draft) => {
        draft.error = errorMessage(cause);
      });
    }
  }

  async function selectReviewFile(filePath: string, staged: boolean): Promise<void> {
    const target = state.reviewTarget;
    if (!target) return;
    try {
      const diff = await port().gitReview.getDiff({
        repositoryId: target.repositoryId,
        worktreeId: target.worktreeId,
        filePath,
        staged,
      });
      setState((draft) => {
        draft.reviewDiff = diff;
      });
    } catch (cause) {
      setState((draft) => {
        draft.error = errorMessage(cause);
      });
    }
  }

  return {
    state,
    load,
    selectProject,
    createProject,
    importRepository,
    detachRepository,
    refreshRepository,
    createWorktree,
    refreshWorktree,
    removeWorktree,
    confirmForceRemoveWorktree,
    createTask,
    updateTaskStatus,
    archiveTask,
    openReview,
    selectReviewFile,
    chooseRepositoryFolder: () => port().repositories.chooseFolder(),
    chooseRepositoryFolders: () => port().repositories.chooseFolders(),
    closeReview: () =>
      setState((draft) => {
        draft.reviewTarget = null;
        draft.reviewSnapshot = null;
        draft.reviewDiff = null;
        draft.reviewGitHub = null;
      }),
    cancelForceRemoveWorktree: () =>
      setState((draft) => {
        draft.dirtyWorktreeToRemove = null;
        draft.error = null;
      }),
    openCreate: () =>
      setState((draft) => {
        draft.createOpen = true;
      }),
    closeCreate: () =>
      setState((draft) => {
        draft.createOpen = false;
        draft.error = null;
      }),
    openImport: () =>
      setState((draft) => {
        draft.importOpen = true;
      }),
    closeImport: () =>
      setState((draft) => {
        draft.importOpen = false;
        draft.error = null;
      }),
    openCreateTask: () =>
      setState((draft) => {
        draft.createTaskOpen = true;
        draft.error = null;
      }),
    closeCreateTask: () =>
      setState((draft) => {
        draft.createTaskOpen = false;
        draft.error = null;
      }),
    openCreateWorktree: (repositoryId: string) =>
      setState((draft) => {
        draft.createWorktreeRepositoryId = repositoryId;
        draft.error = null;
      }),
    closeCreateWorktree: () =>
      setState((draft) => {
        draft.createWorktreeRepositoryId = null;
        draft.error = null;
      }),
  };
}

export type ProjectsStore = ReturnType<typeof createProjectsStore>;
