import {
  type CreatePullRequestInput,
  type GitDiffInput,
  type GitReviewTargetInput,
  parseCreatePullRequestInput,
  parseGitDiffInput,
  parseGitReviewTargetInput,
  parseRepositoryIdInput,
  type RepositoryIdInput,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import { inspectGitReview, readGitDiff } from "../../backend/project/git-review";
import { createGitHubPullRequest, fetchGitHubOverview } from "../../backend/project/github-review";
import type { RepositoryStore } from "../../backend/project/repository-store";
import type { WorktreeStore } from "../../backend/project/worktree-store";
import { type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";

function validInput<T>(parse: (input: unknown) => T | null) {
  return (input: unknown): T => {
    const parsed = parse(input);
    if (!parsed) throw new Error(sourceText("error.billing.invalidRequest"));
    return parsed;
  };
}

export interface GitReviewIpcDependencies {
  repositories: RepositoryStore;
  worktrees: WorktreeStore;
}

function resolveTargetPath(
  repositories: RepositoryStore,
  worktrees: WorktreeStore,
  repositoryId: string,
  worktreeId?: string | null,
): string {
  const repository = repositories.requireRepository(repositoryId);
  if (!worktreeId) return repository.canonicalPath;
  const worktree = worktrees.requireWorktree(worktreeId);
  if (worktree.repositoryId !== repository.id) throw new Error(sourceText("error.backend.worktreeGone"));
  return worktree.canonicalPath;
}

export function gitReviewIpcHandlers({
  repositories,
  worktrees,
}: GitReviewIpcDependencies): Pick<IpcGroupHandlers, "gitReview"> {
  return {
    gitReview: {
      getSnapshot: payloadHandler(
        validInput(parseGitReviewTargetInput),
        ({ repositoryId, worktreeId }: GitReviewTargetInput) =>
          inspectGitReview(resolveTargetPath(repositories, worktrees, repositoryId, worktreeId)),
      ),
      getDiff: payloadHandler(
        validInput(parseGitDiffInput),
        ({ repositoryId, worktreeId, filePath, staged }: GitDiffInput) =>
          readGitDiff(resolveTargetPath(repositories, worktrees, repositoryId, worktreeId), { filePath, staged }),
      ),
      getGitHubOverview: payloadHandler(validInput(parseRepositoryIdInput), ({ repositoryId }: RepositoryIdInput) => {
        const repository = repositories.requireRepository(repositoryId);
        return fetchGitHubOverview(repository.remoteUrl, repository.canonicalPath);
      }),
      createPullRequest: payloadHandler(
        validInput(parseCreatePullRequestInput),
        ({ repositoryId, worktreeId, title, body, baseBranch, draft }: CreatePullRequestInput) =>
          createGitHubPullRequest(resolveTargetPath(repositories, worktrees, repositoryId, worktreeId), {
            title,
            body,
            baseBranch,
            draft,
          }),
      ),
    },
  };
}
