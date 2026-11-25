import type { OpenBotProject, OpenBotRepository, ProjectDashboardSummary } from "@openbot/contracts/project";
import { createStore } from "solid-js";
import type { ProjectPort } from "../project-port";
import { readActiveProjectId, writeActiveProjectId } from "../project-selection-storage";

export interface ProjectsState {
  workspaceId: string | null;
  projects: OpenBotProject[];
  activeProjectId: string | null;
  repositories: OpenBotRepository[];
  dashboard: ProjectDashboardSummary | null;
  loading: boolean;
  error: string | null;
  pending: boolean;
  createOpen: boolean;
  importOpen: boolean;
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** Owns the project/repository list state for the Projects page (PRD FR-02/FR-03/FR-13). */
export function createProjectsStore(port: () => ProjectPort) {
  const [state, setState] = createStore<ProjectsState>({
    workspaceId: null,
    projects: [],
    activeProjectId: null,
    repositories: [],
    dashboard: null,
    loading: false,
    error: null,
    pending: false,
    createOpen: false,
    importOpen: false,
  });

  async function loadRepositories(projectId: string) {
    const [repositories, dashboard] = await Promise.all([
      port().repositories.listForProject({ projectId }),
      port().projects.getDashboardSummary({ projectId }),
    ]);
    setState((draft) => {
      if (draft.activeProjectId !== projectId) return;
      draft.repositories = repositories;
      draft.dashboard = dashboard;
    });
  }

  function selectProject(projectId: string | null) {
    setState((draft) => {
      draft.activeProjectId = projectId;
      draft.repositories = [];
      draft.dashboard = null;
    });
    writeActiveProjectId(projectId);
    if (projectId) void loadRepositories(projectId);
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

  async function createProject(input: { name: string; description: string }): Promise<boolean> {
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
      setState((draft) => {
        draft.projects = [...draft.projects, project];
        draft.pending = false;
        draft.createOpen = false;
      });
      selectProject(project.id);
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
        draft.repositories = [...draft.repositories, repository];
        draft.dashboard = draft.dashboard
          ? { ...draft.dashboard, repositoryCount: draft.dashboard.repositoryCount + 1 }
          : draft.dashboard;
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
        draft.repositories = draft.repositories.filter((repository) => repository.id !== repositoryId);
        draft.dashboard = draft.dashboard
          ? { ...draft.dashboard, repositoryCount: Math.max(0, draft.dashboard.repositoryCount - 1) }
          : draft.dashboard;
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
      setState((draft) => {
        draft.repositories = draft.repositories.map((repository) =>
          repository.id === repositoryId ? refreshed : repository,
        );
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
  };
}

export type ProjectsStore = ReturnType<typeof createProjectsStore>;
