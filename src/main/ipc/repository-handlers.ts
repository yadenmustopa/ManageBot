import {
  type DetachRepositoryInput,
  type ImportRepositoryInput,
  type ProjectIdInput,
  parseDetachRepositoryInput,
  parseImportRepositoryInput,
  parseProjectIdInput,
  parseRepositoryIdInput,
  parseSearchProjectFilesInput,
  type RepositoryIdInput,
  type SearchProjectFilesInput,
} from "@openbot/contracts/project";
import type { AppTranslate } from "@openbot/i18n";
import { sourceText } from "@openbot/i18n/source";
import type { BrowserWindow } from "electron";
import { searchProjectFiles } from "../../backend/project/project-file-search";
import type { RepositoryStore } from "../../backend/project/repository-store";
import type { ThreadRepositoryScopeStore } from "../../backend/project/thread-repository-scope";
import { pickFolder, pickFolders } from "../folder-dialog";
import { handler, type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";

function validInput<T>(parse: (input: unknown) => T | null) {
  return (input: unknown): T => {
    const parsed = parse(input);
    if (!parsed) throw new Error(sourceText("error.billing.invalidRequest"));
    return parsed;
  };
}

export interface RepositoryIpcDependencies {
  repositories: RepositoryStore;
  threadRepositoryScopes: ThreadRepositoryScopeStore;
  getMainWindow: () => BrowserWindow | null;
  translate: AppTranslate;
}

export function repositoryIpcHandlers({
  repositories,
  threadRepositoryScopes,
  getMainWindow,
  translate,
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
      chooseFolder: handler(async () => {
        const selected = await pickFolder(getMainWindow(), {
          title: translate("project.import.chooseFolder"),
          properties: ["openDirectory"],
        });
        return selected ?? null;
      }),
      chooseFolders: handler(() =>
        pickFolders(getMainWindow(), {
          title: translate("project.import.chooseFolders"),
          properties: ["openDirectory", "multiSelections"],
        }),
      ),
      searchFiles: payloadHandler(validInput(parseSearchProjectFilesInput), (input: SearchProjectFilesInput) =>
        searchProjectFiles(threadRepositoryScopes, repositories, input),
      ),
    },
  };
}
