import {
  parseSetThreadRepositoryScopeInput,
  parseThreadIdInput,
  type SetThreadRepositoryScopeInput,
  type ThreadIdInput,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import type { ThreadRepositoryScopeStore } from "../../backend/project/thread-repository-scope";
import { type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";

function validInput<T>(parse: (input: unknown) => T | null) {
  return (input: unknown): T => {
    const parsed = parse(input);
    if (!parsed) throw new Error(sourceText("error.billing.invalidRequest"));
    return parsed;
  };
}

export interface ThreadRepositoryScopeIpcDependencies {
  threadRepositoryScopes: ThreadRepositoryScopeStore;
}

export function threadRepositoryScopeIpcHandlers({
  threadRepositoryScopes,
}: ThreadRepositoryScopeIpcDependencies): Pick<IpcGroupHandlers, "threadRepositoryScope"> {
  return {
    threadRepositoryScope: {
      getScope: payloadHandler(validInput(parseThreadIdInput), ({ threadId }: ThreadIdInput) => {
        const scope = threadRepositoryScopes.getScope(threadId);
        return { threadId, projectId: scope.projectId, repositoryId: scope.repositoryId };
      }),
      setScope: payloadHandler(
        validInput(parseSetThreadRepositoryScopeInput),
        ({ threadId, projectId, repositoryId }: SetThreadRepositoryScopeInput) => {
          threadRepositoryScopes.setScope(threadId, projectId, repositoryId);
          return { threadId, projectId, repositoryId };
        },
      ),
    },
  };
}
