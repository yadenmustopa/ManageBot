import {
  type CodingWorkflowRun,
  type GitDiffResult,
  type GitHubRepositoryOverview,
  type GitReviewSnapshot,
  type OpenBotDevelopmentTask,
  type OpenBotProject,
  type OpenBotRepository,
  type OpenBotWorkspace,
  type OpenBotWorktree,
  type ProjectDashboardSummary,
  parseCodingWorkflowRunList,
  parseCodingWorkflowRunResult,
  parseDevelopmentTaskList,
  parseDevelopmentTaskOrNull,
  parseGitDiffResult,
  parseGitHubRepositoryOverview,
  parseGitReviewSnapshot,
  parseProjectDashboardSummary,
  parseProjectList,
  parseProjectOrNull,
  parseRepositoryList,
  parseRepositoryOrNull,
  parseStringList,
  parseStringResult,
  parseThreadRepositoryScope,
  parseWorkspaceList,
  parseWorkspaceOrNull,
  parseWorktreeList,
  parseWorktreeOrNull,
  parseWorktreeStatus,
  type ThreadRepositoryScope,
  type WorktreeStatus,
} from "@openbot/contracts/project";

function required<T>(value: T | null, label: string): T {
  if (value === null) throw new Error(`Invalid ${label}.`);
  return value;
}

export const decodeWorkspace = (value: unknown): OpenBotWorkspace =>
  required(parseWorkspaceOrNull(value), "workspace response");

export const decodeWorkspaceList = (value: unknown): OpenBotWorkspace[] =>
  required(parseWorkspaceList(value), "workspace list response");

export const decodeProject = (value: unknown): OpenBotProject =>
  required(parseProjectOrNull(value), "project response");

export const decodeProjectOrNull = (value: unknown): OpenBotProject | null =>
  value === null ? null : decodeProject(value);

export const decodeProjectList = (value: unknown): OpenBotProject[] =>
  required(parseProjectList(value), "project list response");

export const decodeRepository = (value: unknown): OpenBotRepository =>
  required(parseRepositoryOrNull(value), "repository response");

export const decodeRepositoryList = (value: unknown): OpenBotRepository[] =>
  required(parseRepositoryList(value), "repository list response");

export const decodeProjectDashboardSummary = (value: unknown): ProjectDashboardSummary =>
  required(parseProjectDashboardSummary(value), "project dashboard summary response");

export const decodeThreadRepositoryScope = (value: unknown): ThreadRepositoryScope =>
  required(parseThreadRepositoryScope(value), "thread repository scope response");

export const decodeWorktree = (value: unknown): OpenBotWorktree =>
  required(parseWorktreeOrNull(value), "worktree response");

export const decodeWorktreeList = (value: unknown): OpenBotWorktree[] =>
  required(parseWorktreeList(value), "worktree list response");

export const decodeWorktreeStatus = (value: unknown): WorktreeStatus =>
  required(parseWorktreeStatus(value), "worktree status response");

export const decodeDevelopmentTask = (value: unknown): OpenBotDevelopmentTask =>
  required(parseDevelopmentTaskOrNull(value), "development task response");

export const decodeDevelopmentTaskOrNull = (value: unknown): OpenBotDevelopmentTask | null =>
  value === null ? null : decodeDevelopmentTask(value);

export const decodeDevelopmentTaskList = (value: unknown): OpenBotDevelopmentTask[] =>
  required(parseDevelopmentTaskList(value), "development task list response");

export const decodeStringList = (value: unknown): string[] => required(parseStringList(value), "string list response");

export const decodeGitReviewSnapshot = (value: unknown): GitReviewSnapshot =>
  required(parseGitReviewSnapshot(value), "git review snapshot response");

export const decodeGitDiffResult = (value: unknown): GitDiffResult =>
  required(parseGitDiffResult(value), "git diff response");

export const decodeGitHubRepositoryOverview = (value: unknown): GitHubRepositoryOverview =>
  required(parseGitHubRepositoryOverview(value), "github overview response");

export const decodeStringResult = (value: unknown): string => required(parseStringResult(value), "string response");

export const decodeNullableStringResult = (value: unknown): string | null =>
  value === null ? null : decodeStringResult(value);

export const decodeCodingWorkflowRun = (value: unknown): CodingWorkflowRun =>
  required(parseCodingWorkflowRunResult(value), "coding workflow run response");

export const decodeCodingWorkflowRunList = (value: unknown): CodingWorkflowRun[] =>
  required(parseCodingWorkflowRunList(value), "coding workflow run list response");
