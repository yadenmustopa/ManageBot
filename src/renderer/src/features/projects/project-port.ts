import type { ProjectsDesktopApi, RepositoriesDesktopApi } from "@openbot/contracts/ipc";

export interface ProjectPort {
  projects: ProjectsDesktopApi;
  repositories: RepositoriesDesktopApi;
}

export function projectPort(): ProjectPort {
  return window.openbot;
}
