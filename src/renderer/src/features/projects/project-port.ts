import type {
  DevelopmentTasksDesktopApi,
  ProjectsDesktopApi,
  RepositoriesDesktopApi,
  ThreadRepositoryScopeDesktopApi,
  WorktreesDesktopApi,
} from "@openbot/contracts/ipc";

export interface ProjectPort {
  projects: ProjectsDesktopApi;
  repositories: RepositoriesDesktopApi;
  worktrees: WorktreesDesktopApi;
  developmentTasks: DevelopmentTasksDesktopApi;
  threadRepositoryScope: ThreadRepositoryScopeDesktopApi;
}

export function projectPort(): ProjectPort {
  return window.openbot;
}
