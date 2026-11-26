import {
  type OpenBotProject,
  type OpenBotRepository,
  type OpenBotWorkspace,
  type OpenBotWorktree,
  type ProjectDashboardSummary,
  parseProjectDashboardSummary,
  parseProjectList,
  parseProjectOrNull,
  parseRepositoryList,
  parseRepositoryOrNull,
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
