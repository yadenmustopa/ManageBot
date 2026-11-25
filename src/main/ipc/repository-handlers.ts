import {
  type DetachRepositoryInput,
  type ImportRepositoryInput,
  type ProjectIdInput,
  parseDetachRepositoryInput,
  parseImportRepositoryInput,
  parseProjectIdInput,
  parseRepositoryIdInput,
  type RepositoryIdInput,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import type { RepositoryStore } from "../../backend/project/repository-store";
import type { IpcGroupHandlers } from "./define-ipc-group";
import { payloadHandler } from "./define-ipc-group";

function validInput<T>(parse: (input: unknown) => T | null) {
  return (input: unknown): T => {
    const parsed = parse(input);
    if (!parsed) throw new Error(sourceText("error.billing.invalidRequest"));
    return parsed;
  };
}

export interface RepositoryIpcDependencies {
  repositories: RepositoryStore;
}

export function repositoryIpcHandlers({
  repositories,
}: RepositoryIpcDependencies): Pick<IpcGroupHandlers, "repositories"> {
  return {
    repositories: {
      importRepository: payloadHandler(
        validInput(parseImportRepositoryInput),
        ({ projectId, path }: ImportRepositoryInput) => repositories.importRepository(projectId, path),
      ),
      listForProject: payloadHandler(validInput(parseProjectIdInput), ({ projectId }: ProjectIdInput) =>
        repositories.listRepositoriesForProject(projectId),
      ),
      refreshRepository: payloadHandler(validInput(parseRepositoryIdInput), ({ repositoryId }: RepositoryIdInput) =>
        repositories.refreshRepository(repositoryId),
      ),
      detachRepository: payloadHandler(
        validInput(parseDetachRepositoryInput),
        ({ projectId, repositoryId }: DetachRepositoryInput) => repositories.detachRepository(projectId, repositoryId),
      ),
    },
  };
}
