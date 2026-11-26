import {
  type CreateWorktreeInput,
  parseCreateWorktreeInput,
  parseRemoveWorktreeInput,
  parseRepositoryIdInput,
  parseWorktreeIdInput,
  type RemoveWorktreeInput,
  type RepositoryIdInput,
  type WorktreeIdInput,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import type { WorktreeStore } from "../../backend/project/worktree-store";
import { type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";

function validInput<T>(parse: (input: unknown) => T | null) {
  return (input: unknown): T => {
    const parsed = parse(input);
    if (!parsed) throw new Error(sourceText("error.billing.invalidRequest"));
    return parsed;
  };
}

export interface WorktreeIpcDependencies {
  worktrees: WorktreeStore;
}

export function worktreeIpcHandlers({ worktrees }: WorktreeIpcDependencies): Pick<IpcGroupHandlers, "worktrees"> {
  return {
    worktrees: {
      create: payloadHandler(
        validInput(parseCreateWorktreeInput),
        ({ repositoryId, branchName, baseRef }: CreateWorktreeInput) =>
          worktrees.createWorktree(repositoryId, branchName, baseRef ?? null),
      ),
      listForRepository: payloadHandler(validInput(parseRepositoryIdInput), ({ repositoryId }: RepositoryIdInput) =>
        worktrees.listWorktreesForRepository(repositoryId),
      ),
      inspect: payloadHandler(validInput(parseWorktreeIdInput), ({ worktreeId }: WorktreeIdInput) =>
        worktrees.inspectWorktree(worktreeId),
      ),
      refresh: payloadHandler(validInput(parseWorktreeIdInput), ({ worktreeId }: WorktreeIdInput) =>
        worktrees.refreshWorktree(worktreeId),
      ),
      // `force` defaults to false: removal of a dirty worktree is a protected action (PRD 11.2) that
      // requires the renderer to have surfaced an explicit confirmation before ever sending `true`.
      remove: payloadHandler(validInput(parseRemoveWorktreeInput), ({ worktreeId, force }: RemoveWorktreeInput) =>
        worktrees.removeWorktree(worktreeId, force ?? false),
      ),
    },
  };
}
