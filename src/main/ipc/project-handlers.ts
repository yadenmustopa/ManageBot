import {
  type CreateProjectInput,
  type ProjectChannelInput,
  type ProjectIdInput,
  parseCreateProjectInput,
  parseProjectChannelInput,
  parseProjectIdInput,
  parseUpdateProjectInput,
  parseWorkspaceIdInput,
  type UpdateProjectInput,
  type WorkspaceIdInput,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import type { ProjectChannelStore } from "../../backend/project/project-channel-store";
import type { ProjectStore } from "../../backend/project/project-store";
import type { RepositoryStore } from "../../backend/project/repository-store";
import type { ThreadRepositoryScopeStore } from "../../backend/project/thread-repository-scope";
import { handler, type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";

function validInput<T>(parse: (input: unknown) => T | null) {
  return (input: unknown): T => {
    const parsed = parse(input);
    if (!parsed) throw new Error(sourceText("error.billing.invalidRequest"));
    return parsed;
  };
}

export interface ProjectIpcDependencies {
  projects: ProjectStore;
  repositories: RepositoryStore;
  projectChannels: ProjectChannelStore;
  threadRepositoryScopes: ThreadRepositoryScopeStore;
}

export function projectIpcHandlers({
  projects,
  repositories,
  projectChannels,
  threadRepositoryScopes,
}: ProjectIpcDependencies): Pick<IpcGroupHandlers, "projects"> {
  return {
    projects: {
      ensureDefaultWorkspace: handler(() => projects.ensureDefaultWorkspace()),
      listWorkspaces: handler(() => projects.listWorkspaces()),
      listProjects: payloadHandler(validInput(parseWorkspaceIdInput), ({ workspaceId }: WorkspaceIdInput) =>
        projects.listProjects(workspaceId),
      ),
      getProject: payloadHandler(validInput(parseProjectIdInput), ({ projectId }: ProjectIdInput) =>
        projects.getProject(projectId),
      ),
      createProject: payloadHandler(validInput(parseCreateProjectInput), (input: CreateProjectInput) =>
        projects.createProject(input),
      ),
      updateProject: payloadHandler(validInput(parseUpdateProjectInput), (input: UpdateProjectInput) =>
        projects.updateProject(input),
      ),
      archiveProject: payloadHandler(validInput(parseProjectIdInput), ({ projectId }: ProjectIdInput) =>
        projects.archiveProject(projectId),
      ),
      restoreProject: payloadHandler(validInput(parseProjectIdInput), ({ projectId }: ProjectIdInput) =>
        projects.restoreProject(projectId),
      ),
      getDashboardSummary: payloadHandler(validInput(parseProjectIdInput), ({ projectId }: ProjectIdInput) => ({
        projectId,
        repositoryCount: repositories.listRepositoriesForProject(projectId).length,
      })),
      listSessions: payloadHandler(validInput(parseProjectIdInput), ({ projectId }: ProjectIdInput) =>
        threadRepositoryScopes.listSessionsForProject(projectId),
      ),
      listChannels: payloadHandler(validInput(parseProjectIdInput), ({ projectId }: ProjectIdInput) =>
        projectChannels.listChannelsForProject(projectId),
      ),
      attachChannel: payloadHandler(
        validInput(parseProjectChannelInput),
        ({ projectId, channelId, isDefault }: ProjectChannelInput) =>
          projectChannels.attachChannel(projectId, channelId, isDefault),
      ),
      detachChannel: payloadHandler(
        validInput(parseProjectChannelInput),
        ({ projectId, channelId }: ProjectChannelInput) => projectChannels.detachChannel(projectId, channelId),
      ),
      setDefaultChannel: payloadHandler(
        validInput(parseProjectChannelInput),
        ({ projectId, channelId }: ProjectChannelInput) => projectChannels.setDefaultChannel(projectId, channelId),
      ),
    },
  };
}
