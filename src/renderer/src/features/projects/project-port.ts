import type {
  ProjectsDesktopApi,
  RepositoriesDesktopApi,
  ThreadRepositoryScopeDesktopApi,
} from "@openbot/contracts/ipc";

export interface ProjectPort {
  projects: ProjectsDesktopApi;
  repositories: RepositoriesDesktopApi;
  threadRepositoryScope: ThreadRepositoryScopeDesktopApi;
}

export function projectPort(): ProjectPort {
  return window.openbot;
}
