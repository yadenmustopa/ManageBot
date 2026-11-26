import { type DynamicRecord, isBoolean, isDynamicRecord, isOneOf, isString } from "./runtime-values";

export const LOCAL_HOST_ID = "local";

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 4_000;
const MAX_PATH_LENGTH = 4_096;

export interface OpenBotWorkspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface OpenBotProject {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  icon: string | null;
  color: string | null;
  pinned: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export type RepositoryHealth = "available" | "missing" | "dirty" | "detached-head" | "invalid";

export interface OpenBotRepository {
  id: string;
  hostId: string;
  name: string;
  canonicalPath: string;
  remoteUrl: string | null;
  currentBranch: string | null;
  defaultBranch: string | null;
  dirty: boolean | null;
  health: RepositoryHealth;
  lastRefreshedAt: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ProjectRepositoryLink {
  projectId: string;
  repositoryId: string;
  sortOrder: number;
  createdAt: string;
}

export interface ProjectDashboardSummary {
  projectId: string;
  repositoryCount: number;
}

export function createWorkspaceId(): string {
  return `workspace-${crypto.randomUUID()}`;
}

export function createProjectId(): string {
  return `project-${crypto.randomUUID()}`;
}

export function createRepositoryId(): string {
  return `repo-${crypto.randomUUID()}`;
}

export function createWorktreeId(): string {
  return `worktree-${crypto.randomUUID()}`;
}

function isNonEmptyName(value: unknown): value is string {
  return isString(value) && value.trim().length > 0 && value.length <= MAX_NAME_LENGTH;
}

function isDescription(value: unknown): value is string {
  return isString(value) && value.length <= MAX_DESCRIPTION_LENGTH;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isNullableBoolean(value: unknown): value is boolean | null {
  return value === null || isBoolean(value);
}

export interface CreateProjectInput {
  workspaceId: string;
  name: string;
  description?: string;
  icon?: string | null;
  color?: string | null;
}

export function parseCreateProjectInput(value: unknown): CreateProjectInput | null {
  if (!isDynamicRecord(value) || !isString(value.workspaceId) || !isNonEmptyName(value.name)) return null;
  const input: CreateProjectInput = { workspaceId: value.workspaceId, name: value.name.trim() };
  if (value.description !== undefined) {
    if (!isDescription(value.description)) return null;
    input.description = value.description;
  }
  if (value.icon !== undefined) {
    if (!isNullableString(value.icon)) return null;
    input.icon = value.icon;
  }
  if (value.color !== undefined) {
    if (!isNullableString(value.color)) return null;
    input.color = value.color;
  }
  return input;
}

export interface UpdateProjectInput {
  projectId: string;
  name?: string;
  description?: string;
  icon?: string | null;
  color?: string | null;
  pinned?: boolean;
}

export function parseUpdateProjectInput(value: unknown): UpdateProjectInput | null {
  if (!isDynamicRecord(value) || !isString(value.projectId)) return null;
  const input: UpdateProjectInput = { projectId: value.projectId };
  if (value.name !== undefined) {
    if (!isNonEmptyName(value.name)) return null;
    input.name = value.name.trim();
  }
  if (value.description !== undefined) {
    if (!isDescription(value.description)) return null;
    input.description = value.description;
  }
  if (value.icon !== undefined) {
    if (!isNullableString(value.icon)) return null;
    input.icon = value.icon;
  }
  if (value.color !== undefined) {
    if (!isNullableString(value.color)) return null;
    input.color = value.color;
  }
  if (value.pinned !== undefined) {
    if (!isBoolean(value.pinned)) return null;
    input.pinned = value.pinned;
  }
  return input;
}

export interface ProjectIdInput {
  projectId: string;
}

export function parseProjectIdInput(value: unknown): ProjectIdInput | null {
  return isDynamicRecord(value) && isString(value.projectId) ? { projectId: value.projectId } : null;
}

export interface WorkspaceIdInput {
  workspaceId: string;
}

export function parseWorkspaceIdInput(value: unknown): WorkspaceIdInput | null {
  return isDynamicRecord(value) && isString(value.workspaceId) ? { workspaceId: value.workspaceId } : null;
}

export interface ImportRepositoryInput {
  projectId: string;
  path: string;
}

export function parseImportRepositoryInput(value: unknown): ImportRepositoryInput | null {
  if (!isDynamicRecord(value) || !isString(value.projectId) || !isString(value.path)) return null;
  if (value.path.trim().length === 0 || value.path.length > MAX_PATH_LENGTH) return null;
  return { projectId: value.projectId, path: value.path };
}

export interface RepositoryIdInput {
  repositoryId: string;
}

export function parseRepositoryIdInput(value: unknown): RepositoryIdInput | null {
  return isDynamicRecord(value) && isString(value.repositoryId) ? { repositoryId: value.repositoryId } : null;
}

export interface DetachRepositoryInput {
  projectId: string;
  repositoryId: string;
}

export function parseDetachRepositoryInput(value: unknown): DetachRepositoryInput | null {
  if (!isDynamicRecord(value) || !isString(value.projectId) || !isString(value.repositoryId)) return null;
  return { projectId: value.projectId, repositoryId: value.repositoryId };
}

function parseWorkspace(row: DynamicRecord): OpenBotWorkspace | null {
  if (!isString(row.id) || !isString(row.name) || !isString(row.createdAt) || !isString(row.updatedAt)) return null;
  if (!isNullableString(row.archivedAt)) return null;
  return { id: row.id, name: row.name, createdAt: row.createdAt, updatedAt: row.updatedAt, archivedAt: row.archivedAt };
}

export function parseWorkspaceOrNull(value: unknown): OpenBotWorkspace | null {
  return isDynamicRecord(value) ? parseWorkspace(value) : null;
}

export function parseWorkspaceList(value: unknown): OpenBotWorkspace[] | null {
  if (!Array.isArray(value)) return null;
  const workspaces: OpenBotWorkspace[] = [];
  for (const item of value) {
    if (!isDynamicRecord(item)) return null;
    const workspace = parseWorkspace(item);
    if (!workspace) return null;
    workspaces.push(workspace);
  }
  return workspaces;
}

function parseProject(row: DynamicRecord): OpenBotProject | null {
  if (
    !isString(row.id) ||
    !isString(row.workspaceId) ||
    !isString(row.name) ||
    !isString(row.description) ||
    !isNullableString(row.icon) ||
    !isNullableString(row.color) ||
    !isBoolean(row.pinned) ||
    typeof row.sortOrder !== "number" ||
    !isString(row.createdAt) ||
    !isString(row.updatedAt) ||
    !isNullableString(row.archivedAt)
  )
    return null;
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    pinned: row.pinned,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
  };
}

export function parseProjectList(value: unknown): OpenBotProject[] | null {
  if (!Array.isArray(value)) return null;
  const projects: OpenBotProject[] = [];
  for (const item of value) {
    if (!isDynamicRecord(item)) return null;
    const project = parseProject(item);
    if (!project) return null;
    projects.push(project);
  }
  return projects;
}

export function parseProjectOrNull(value: unknown): OpenBotProject | null {
  return isDynamicRecord(value) ? parseProject(value) : null;
}

export const REPOSITORY_HEALTH_VALUES: readonly RepositoryHealth[] = [
  "available",
  "missing",
  "dirty",
  "detached-head",
  "invalid",
];

function isRepositoryHealth(value: unknown): value is RepositoryHealth {
  return isOneOf(REPOSITORY_HEALTH_VALUES, value);
}

function parseRepository(row: DynamicRecord): OpenBotRepository | null {
  if (
    !isString(row.id) ||
    !isString(row.hostId) ||
    !isString(row.name) ||
    !isString(row.canonicalPath) ||
    !isNullableString(row.remoteUrl) ||
    !isNullableString(row.currentBranch) ||
    !isNullableString(row.defaultBranch) ||
    !isNullableBoolean(row.dirty) ||
    !isRepositoryHealth(row.health) ||
    !isString(row.lastRefreshedAt) ||
    !isString(row.createdAt) ||
    !isString(row.updatedAt) ||
    !isNullableString(row.archivedAt)
  )
    return null;
  return {
    id: row.id,
    hostId: row.hostId,
    name: row.name,
    canonicalPath: row.canonicalPath,
    remoteUrl: row.remoteUrl,
    currentBranch: row.currentBranch,
    defaultBranch: row.defaultBranch,
    dirty: row.dirty,
    health: row.health,
    lastRefreshedAt: row.lastRefreshedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
  };
}

export function parseRepositoryList(value: unknown): OpenBotRepository[] | null {
  if (!Array.isArray(value)) return null;
  const repositories: OpenBotRepository[] = [];
  for (const item of value) {
    if (!isDynamicRecord(item)) return null;
    const repository = parseRepository(item);
    if (!repository) return null;
    repositories.push(repository);
  }
  return repositories;
}

export function parseRepositoryOrNull(value: unknown): OpenBotRepository | null {
  return isDynamicRecord(value) ? parseRepository(value) : null;
}

export function parseProjectDashboardSummary(value: unknown): ProjectDashboardSummary | null {
  if (!isDynamicRecord(value) || !isString(value.projectId) || typeof value.repositoryCount !== "number") return null;
  return { projectId: value.projectId, repositoryCount: value.repositoryCount };
}

export interface ThreadRepositoryScope {
  threadId: string;
  projectId: string | null;
  repositoryId: string | null;
  /** Phase 3: when set, a session's execution context resolves to this worktree, not the repository root. */
  worktreeId: string | null;
}

export interface ThreadIdInput {
  threadId: string;
}

export function parseThreadIdInput(value: unknown): ThreadIdInput | null {
  return isDynamicRecord(value) && isString(value.threadId) ? { threadId: value.threadId } : null;
}

export interface SetThreadRepositoryScopeInput {
  threadId: string;
  projectId: string | null;
  repositoryId: string | null;
  worktreeId?: string | null;
}

export function parseSetThreadRepositoryScopeInput(value: unknown): SetThreadRepositoryScopeInput | null {
  if (!isDynamicRecord(value) || !isString(value.threadId)) return null;
  if (!isNullableString(value.projectId) || !isNullableString(value.repositoryId)) return null;
  const input: SetThreadRepositoryScopeInput = {
    threadId: value.threadId,
    projectId: value.projectId,
    repositoryId: value.repositoryId,
  };
  if (value.worktreeId !== undefined) {
    if (!isNullableString(value.worktreeId)) return null;
    input.worktreeId = value.worktreeId;
  }
  return input;
}

export function parseThreadRepositoryScope(value: unknown): ThreadRepositoryScope | null {
  if (!isDynamicRecord(value) || !isString(value.threadId)) return null;
  if (!isNullableString(value.projectId) || !isNullableString(value.repositoryId)) return null;
  if (!isNullableString(value.worktreeId)) return null;
  return {
    threadId: value.threadId,
    projectId: value.projectId,
    repositoryId: value.repositoryId,
    worktreeId: value.worktreeId,
  };
}

export type WorktreeLifecycleStatus = "active" | "stale" | "archived";

export const WORKTREE_LIFECYCLE_STATUS_VALUES: readonly WorktreeLifecycleStatus[] = ["active", "stale", "archived"];

function isWorktreeLifecycleStatus(value: unknown): value is WorktreeLifecycleStatus {
  return isOneOf(WORKTREE_LIFECYCLE_STATUS_VALUES, value);
}

export interface OpenBotWorktree {
  id: string;
  repositoryId: string;
  hostId: string;
  taskId: string | null;
  branchName: string;
  baseRef: string | null;
  canonicalPath: string;
  managedByApplication: boolean;
  lifecycleStatus: WorktreeLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface WorktreeStatus {
  worktreeId: string;
  /** false when the directory is missing on disk. */
  exists: boolean;
  isWorkingTree: boolean;
  currentBranch: string | null;
  dirty: boolean | null;
}

function parseWorktree(row: DynamicRecord): OpenBotWorktree | null {
  if (
    !isString(row.id) ||
    !isString(row.repositoryId) ||
    !isString(row.hostId) ||
    !isNullableString(row.taskId) ||
    !isString(row.branchName) ||
    !isNullableString(row.baseRef) ||
    !isString(row.canonicalPath) ||
    !isBoolean(row.managedByApplication) ||
    !isWorktreeLifecycleStatus(row.lifecycleStatus) ||
    !isString(row.createdAt) ||
    !isString(row.updatedAt) ||
    !isNullableString(row.archivedAt)
  )
    return null;
  return {
    id: row.id,
    repositoryId: row.repositoryId,
    hostId: row.hostId,
    taskId: row.taskId,
    branchName: row.branchName,
    baseRef: row.baseRef,
    canonicalPath: row.canonicalPath,
    managedByApplication: row.managedByApplication,
    lifecycleStatus: row.lifecycleStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
  };
}

export function parseWorktreeOrNull(value: unknown): OpenBotWorktree | null {
  return isDynamicRecord(value) ? parseWorktree(value) : null;
}

export function parseWorktreeList(value: unknown): OpenBotWorktree[] | null {
  if (!Array.isArray(value)) return null;
  const worktrees: OpenBotWorktree[] = [];
  for (const item of value) {
    if (!isDynamicRecord(item)) return null;
    const worktree = parseWorktree(item);
    if (!worktree) return null;
    worktrees.push(worktree);
  }
  return worktrees;
}

export function parseWorktreeStatus(value: unknown): WorktreeStatus | null {
  if (!isDynamicRecord(value) || !isString(value.worktreeId) || !isBoolean(value.exists)) return null;
  if (!isBoolean(value.isWorkingTree) || !isNullableString(value.currentBranch) || !isNullableBoolean(value.dirty))
    return null;
  return {
    worktreeId: value.worktreeId,
    exists: value.exists,
    isWorkingTree: value.isWorkingTree,
    currentBranch: value.currentBranch,
    dirty: value.dirty,
  };
}

export interface CreateWorktreeInput {
  repositoryId: string;
  branchName: string;
  baseRef?: string | null;
}

export function parseCreateWorktreeInput(value: unknown): CreateWorktreeInput | null {
  if (!isDynamicRecord(value) || !isString(value.repositoryId) || !isString(value.branchName)) return null;
  if (value.branchName.trim().length === 0 || value.branchName.length > MAX_NAME_LENGTH) return null;
  const input: CreateWorktreeInput = { repositoryId: value.repositoryId, branchName: value.branchName };
  if (value.baseRef !== undefined) {
    if (!isNullableString(value.baseRef)) return null;
    input.baseRef = value.baseRef;
  }
  return input;
}

export interface WorktreeIdInput {
  worktreeId: string;
}

export function parseWorktreeIdInput(value: unknown): WorktreeIdInput | null {
  return isDynamicRecord(value) && isString(value.worktreeId) ? { worktreeId: value.worktreeId } : null;
}

export interface RemoveWorktreeInput {
  worktreeId: string;
  force?: boolean;
}

export function parseRemoveWorktreeInput(value: unknown): RemoveWorktreeInput | null {
  if (!isDynamicRecord(value) || !isString(value.worktreeId)) return null;
  const input: RemoveWorktreeInput = { worktreeId: value.worktreeId };
  if (value.force !== undefined) {
    if (!isBoolean(value.force)) return null;
    input.force = value.force;
  }
  return input;
}

export const DEVELOPMENT_TASK_TYPE_VALUES = [
  "feature",
  "bug",
  "refactor",
  "documentation",
  "research",
  "testing",
  "security",
  "infrastructure",
  "maintenance",
] as const;

export type DevelopmentTaskType = (typeof DEVELOPMENT_TASK_TYPE_VALUES)[number];

export const DEVELOPMENT_TASK_PRIORITY_VALUES = ["p0", "p1", "p2", "p3"] as const;

export type DevelopmentTaskPriority = (typeof DEVELOPMENT_TASK_PRIORITY_VALUES)[number];

export const DEVELOPMENT_TASK_STATUS_VALUES = [
  "backlog",
  "ready",
  "planning",
  "in-progress",
  "testing",
  "in-review",
  "changes-requested",
  "blocked",
  "ready-to-merge",
  "done",
  "cancelled",
] as const;

export type DevelopmentTaskStatus = (typeof DEVELOPMENT_TASK_STATUS_VALUES)[number];

export interface OpenBotDevelopmentTask {
  id: string;
  projectId: string;
  repositoryId: string | null;
  parentTaskId: string | null;
  title: string;
  description: string;
  acceptanceCriteria: string;
  taskType: DevelopmentTaskType;
  priority: DevelopmentTaskPriority;
  status: DevelopmentTaskStatus;
  assignedAgentId: string | null;
  worktreeId: string | null;
  externalIssueRef: string | null;
  externalPrRef: string | null;
  blockerReason: string | null;
  testEvidence: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
}

export function createDevelopmentTaskId(): string {
  return `devtask-${crypto.randomUUID()}`;
}

function parseDevelopmentTask(row: DynamicRecord): OpenBotDevelopmentTask | null {
  if (
    !isString(row.id) ||
    !isString(row.projectId) ||
    !isNullableString(row.repositoryId) ||
    !isNullableString(row.parentTaskId) ||
    !isString(row.title) ||
    !isString(row.description) ||
    !isString(row.acceptanceCriteria) ||
    !isOneOf(DEVELOPMENT_TASK_TYPE_VALUES, row.taskType) ||
    !isOneOf(DEVELOPMENT_TASK_PRIORITY_VALUES, row.priority) ||
    !isOneOf(DEVELOPMENT_TASK_STATUS_VALUES, row.status) ||
    !isNullableString(row.assignedAgentId) ||
    !isNullableString(row.worktreeId) ||
    !isNullableString(row.externalIssueRef) ||
    !isNullableString(row.externalPrRef) ||
    !isNullableString(row.blockerReason) ||
    !isNullableString(row.testEvidence) ||
    !isString(row.createdAt) ||
    !isString(row.updatedAt) ||
    !isNullableString(row.completedAt) ||
    !isNullableString(row.archivedAt)
  )
    return null;
  return {
    id: row.id,
    projectId: row.projectId,
    repositoryId: row.repositoryId,
    parentTaskId: row.parentTaskId,
    title: row.title,
    description: row.description,
    acceptanceCriteria: row.acceptanceCriteria,
    taskType: row.taskType,
    priority: row.priority,
    status: row.status,
    assignedAgentId: row.assignedAgentId,
    worktreeId: row.worktreeId,
    externalIssueRef: row.externalIssueRef,
    externalPrRef: row.externalPrRef,
    blockerReason: row.blockerReason,
    testEvidence: row.testEvidence,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    archivedAt: row.archivedAt,
  };
}

export function parseDevelopmentTaskOrNull(value: unknown): OpenBotDevelopmentTask | null {
  return isDynamicRecord(value) ? parseDevelopmentTask(value) : null;
}

export function parseDevelopmentTaskList(value: unknown): OpenBotDevelopmentTask[] | null {
  if (!Array.isArray(value)) return null;
  const tasks: OpenBotDevelopmentTask[] = [];
  for (const item of value) {
    if (!isDynamicRecord(item)) return null;
    const task = parseDevelopmentTask(item);
    if (!task) return null;
    tasks.push(task);
  }
  return tasks;
}

export function parseStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items: string[] = [];
  for (const item of value) {
    if (!isString(item)) return null;
    items.push(item);
  }
  return items;
}

export interface CreateDevelopmentTaskInput {
  projectId: string;
  repositoryId?: string | null;
  parentTaskId?: string | null;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  taskType?: DevelopmentTaskType;
  priority?: DevelopmentTaskPriority;
}

export function parseCreateDevelopmentTaskInput(value: unknown): CreateDevelopmentTaskInput | null {
  if (!isDynamicRecord(value) || !isString(value.projectId) || !isNonEmptyName(value.title)) return null;
  const input: CreateDevelopmentTaskInput = { projectId: value.projectId, title: value.title };
  if (value.repositoryId !== undefined) {
    if (!isNullableString(value.repositoryId)) return null;
    input.repositoryId = value.repositoryId;
  }
  if (value.parentTaskId !== undefined) {
    if (!isNullableString(value.parentTaskId)) return null;
    input.parentTaskId = value.parentTaskId;
  }
  if (value.description !== undefined) {
    if (!isString(value.description) || value.description.length > MAX_DESCRIPTION_LENGTH) return null;
    input.description = value.description;
  }
  if (value.acceptanceCriteria !== undefined) {
    if (!isString(value.acceptanceCriteria) || value.acceptanceCriteria.length > MAX_DESCRIPTION_LENGTH) return null;
    input.acceptanceCriteria = value.acceptanceCriteria;
  }
  if (value.taskType !== undefined) {
    if (!isOneOf(DEVELOPMENT_TASK_TYPE_VALUES, value.taskType)) return null;
    input.taskType = value.taskType;
  }
  if (value.priority !== undefined) {
    if (!isOneOf(DEVELOPMENT_TASK_PRIORITY_VALUES, value.priority)) return null;
    input.priority = value.priority;
  }
  return input;
}

export interface UpdateDevelopmentTaskInput {
  taskId: string;
  title?: string;
  description?: string;
  acceptanceCriteria?: string;
  taskType?: DevelopmentTaskType;
  priority?: DevelopmentTaskPriority;
  status?: DevelopmentTaskStatus;
  assignedAgentId?: string | null;
  worktreeId?: string | null;
  externalIssueRef?: string | null;
  externalPrRef?: string | null;
  blockerReason?: string | null;
  testEvidence?: string | null;
}

export function parseUpdateDevelopmentTaskInput(value: unknown): UpdateDevelopmentTaskInput | null {
  if (!isDynamicRecord(value) || !isString(value.taskId)) return null;
  const input: UpdateDevelopmentTaskInput = { taskId: value.taskId };
  if (value.title !== undefined) {
    if (!isNonEmptyName(value.title)) return null;
    input.title = value.title;
  }
  if (value.description !== undefined) {
    if (!isString(value.description) || value.description.length > MAX_DESCRIPTION_LENGTH) return null;
    input.description = value.description;
  }
  if (value.acceptanceCriteria !== undefined) {
    if (!isString(value.acceptanceCriteria) || value.acceptanceCriteria.length > MAX_DESCRIPTION_LENGTH) return null;
    input.acceptanceCriteria = value.acceptanceCriteria;
  }
  if (value.taskType !== undefined) {
    if (!isOneOf(DEVELOPMENT_TASK_TYPE_VALUES, value.taskType)) return null;
    input.taskType = value.taskType;
  }
  if (value.priority !== undefined) {
    if (!isOneOf(DEVELOPMENT_TASK_PRIORITY_VALUES, value.priority)) return null;
    input.priority = value.priority;
  }
  if (value.status !== undefined) {
    if (!isOneOf(DEVELOPMENT_TASK_STATUS_VALUES, value.status)) return null;
    input.status = value.status;
  }
  if (value.assignedAgentId !== undefined) {
    if (!isNullableString(value.assignedAgentId)) return null;
    input.assignedAgentId = value.assignedAgentId;
  }
  if (value.worktreeId !== undefined) {
    if (!isNullableString(value.worktreeId)) return null;
    input.worktreeId = value.worktreeId;
  }
  if (value.externalIssueRef !== undefined) {
    if (!isNullableString(value.externalIssueRef)) return null;
    input.externalIssueRef = value.externalIssueRef;
  }
  if (value.externalPrRef !== undefined) {
    if (!isNullableString(value.externalPrRef)) return null;
    input.externalPrRef = value.externalPrRef;
  }
  if (value.blockerReason !== undefined) {
    if (!isNullableString(value.blockerReason)) return null;
    input.blockerReason = value.blockerReason;
  }
  if (value.testEvidence !== undefined) {
    if (!isNullableString(value.testEvidence)) return null;
    input.testEvidence = value.testEvidence;
  }
  return input;
}

export interface DevelopmentTaskIdInput {
  taskId: string;
}

export function parseDevelopmentTaskIdInput(value: unknown): DevelopmentTaskIdInput | null {
  return isDynamicRecord(value) && isString(value.taskId) ? { taskId: value.taskId } : null;
}

export interface DevelopmentTaskDependencyInput {
  taskId: string;
  dependsOnTaskId: string;
}

export function parseDevelopmentTaskDependencyInput(value: unknown): DevelopmentTaskDependencyInput | null {
  if (!isDynamicRecord(value) || !isString(value.taskId) || !isString(value.dependsOnTaskId)) return null;
  return { taskId: value.taskId, dependsOnTaskId: value.dependsOnTaskId };
}

export const GIT_FILE_STATUS_VALUES = ["modified", "added", "deleted", "renamed", "untracked", "conflicted"] as const;
export type GitFileStatus = (typeof GIT_FILE_STATUS_VALUES)[number];

export interface GitChangedFile {
  path: string;
  status: GitFileStatus;
  staged: boolean;
}

export interface GitCommitEntry {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  authoredAt: string;
}

export interface GitReviewSnapshot {
  targetPath: string;
  currentBranch: string | null;
  files: GitChangedFile[];
  commits: GitCommitEntry[];
  hasConflicts: boolean;
}

export interface GitDiffResult {
  diff: string;
  truncated: boolean;
  binary: boolean;
}

export interface GitReviewTargetInput {
  repositoryId: string;
  worktreeId?: string | null;
}

export interface GitDiffInput {
  repositoryId: string;
  worktreeId?: string | null;
  filePath?: string | null;
  staged?: boolean;
}

export interface GitHubIssueSummary {
  number: number;
  title: string;
  state: string;
  url: string;
  author: string | null;
  updatedAt: string;
}

export interface GitHubPullRequestSummary {
  number: number;
  title: string;
  state: string;
  url: string;
  headBranch: string;
  baseBranch: string;
  isDraft: boolean;
  reviewDecision: string | null;
  updatedAt: string;
}

export interface GitHubRepositoryOverview {
  owner: string;
  repo: string;
  issues: GitHubIssueSummary[];
  pullRequests: GitHubPullRequestSummary[];
  error: string | null;
}

export interface CreatePullRequestInput {
  repositoryId: string;
  worktreeId?: string | null;
  title: string;
  body?: string;
  baseBranch?: string | null;
  draft?: boolean;
}

export function parseGitReviewTargetInput(value: unknown): GitReviewTargetInput | null {
  if (!isDynamicRecord(value) || !isString(value.repositoryId)) return null;
  const input: GitReviewTargetInput = { repositoryId: value.repositoryId };
  if (value.worktreeId !== undefined) {
    if (!isNullableString(value.worktreeId)) return null;
    input.worktreeId = value.worktreeId;
  }
  return input;
}

export function parseGitDiffInput(value: unknown): GitDiffInput | null {
  if (!isDynamicRecord(value) || !isString(value.repositoryId)) return null;
  const input: GitDiffInput = { repositoryId: value.repositoryId };
  if (value.worktreeId !== undefined) {
    if (!isNullableString(value.worktreeId)) return null;
    input.worktreeId = value.worktreeId;
  }
  if (value.filePath !== undefined) {
    if (!isNullableString(value.filePath)) return null;
    input.filePath = value.filePath;
  }
  if (value.staged !== undefined) {
    if (!isBoolean(value.staged)) return null;
    input.staged = value.staged;
  }
  return input;
}

export function parseCreatePullRequestInput(value: unknown): CreatePullRequestInput | null {
  if (!isDynamicRecord(value) || !isString(value.repositoryId) || !isNonEmptyName(value.title)) return null;
  const input: CreatePullRequestInput = { repositoryId: value.repositoryId, title: value.title };
  if (value.worktreeId !== undefined) {
    if (!isNullableString(value.worktreeId)) return null;
    input.worktreeId = value.worktreeId;
  }
  if (value.body !== undefined) {
    if (!isString(value.body) || value.body.length > MAX_DESCRIPTION_LENGTH) return null;
    input.body = value.body;
  }
  if (value.baseBranch !== undefined) {
    if (!isNullableString(value.baseBranch)) return null;
    input.baseBranch = value.baseBranch;
  }
  if (value.draft !== undefined) {
    if (!isBoolean(value.draft)) return null;
    input.draft = value.draft;
  }
  return input;
}

export function parseGitReviewSnapshot(value: unknown): GitReviewSnapshot | null {
  if (!isDynamicRecord(value) || !isString(value.targetPath) || !isNullableString(value.currentBranch)) return null;
  if (!Array.isArray(value.files) || !Array.isArray(value.commits) || !isBoolean(value.hasConflicts)) return null;
  const files: GitChangedFile[] = [];
  for (const item of value.files) {
    if (
      !isDynamicRecord(item) ||
      !isString(item.path) ||
      !isOneOf(GIT_FILE_STATUS_VALUES, item.status) ||
      !isBoolean(item.staged)
    )
      return null;
    files.push({ path: item.path, status: item.status, staged: item.staged });
  }
  const commits: GitCommitEntry[] = [];
  for (const item of value.commits) {
    if (
      !isDynamicRecord(item) ||
      !isString(item.hash) ||
      !isString(item.shortHash) ||
      !isString(item.subject) ||
      !isString(item.author) ||
      !isString(item.authoredAt)
    )
      return null;
    commits.push({
      hash: item.hash,
      shortHash: item.shortHash,
      subject: item.subject,
      author: item.author,
      authoredAt: item.authoredAt,
    });
  }
  return {
    targetPath: value.targetPath,
    currentBranch: value.currentBranch,
    files,
    commits,
    hasConflicts: value.hasConflicts,
  };
}

export function parseGitDiffResult(value: unknown): GitDiffResult | null {
  if (!isDynamicRecord(value) || !isString(value.diff) || !isBoolean(value.truncated) || !isBoolean(value.binary))
    return null;
  return { diff: value.diff, truncated: value.truncated, binary: value.binary };
}

export function parseGitHubRepositoryOverview(value: unknown): GitHubRepositoryOverview | null {
  if (
    !isDynamicRecord(value) ||
    !isString(value.owner) ||
    !isString(value.repo) ||
    !Array.isArray(value.issues) ||
    !Array.isArray(value.pullRequests) ||
    !isNullableString(value.error)
  )
    return null;
  const issues: GitHubIssueSummary[] = [];
  for (const item of value.issues) {
    if (
      !isDynamicRecord(item) ||
      typeof item.number !== "number" ||
      !isString(item.title) ||
      !isString(item.state) ||
      !isString(item.url) ||
      !isNullableString(item.author) ||
      !isString(item.updatedAt)
    )
      return null;
    issues.push({
      number: item.number,
      title: item.title,
      state: item.state,
      url: item.url,
      author: item.author,
      updatedAt: item.updatedAt,
    });
  }
  const pullRequests: GitHubPullRequestSummary[] = [];
  for (const item of value.pullRequests) {
    if (
      !isDynamicRecord(item) ||
      typeof item.number !== "number" ||
      !isString(item.title) ||
      !isString(item.state) ||
      !isString(item.url) ||
      !isString(item.headBranch) ||
      !isString(item.baseBranch) ||
      !isBoolean(item.isDraft) ||
      !isNullableString(item.reviewDecision) ||
      !isString(item.updatedAt)
    )
      return null;
    pullRequests.push({
      number: item.number,
      title: item.title,
      state: item.state,
      url: item.url,
      headBranch: item.headBranch,
      baseBranch: item.baseBranch,
      isDraft: item.isDraft,
      reviewDecision: item.reviewDecision,
      updatedAt: item.updatedAt,
    });
  }
  return { owner: value.owner, repo: value.repo, issues, pullRequests, error: value.error };
}

export function parseStringResult(value: unknown): string | null {
  return isString(value) ? value : null;
}

export const CODING_WORKFLOW_STEP_VALUES = ["plan", "worktree", "implement", "test", "review", "approval"] as const;
export type CodingWorkflowStep = (typeof CODING_WORKFLOW_STEP_VALUES)[number];

export const CODING_WORKFLOW_STATUS_VALUES = [
  "running",
  "awaiting-approval",
  "completed",
  "failed",
  "cancelled",
] as const;
export type CodingWorkflowStatus = (typeof CODING_WORKFLOW_STATUS_VALUES)[number];

export interface CodingWorkflowRun {
  id: string;
  taskId: string;
  projectId: string;
  repositoryId: string;
  worktreeId: string | null;
  currentStep: CodingWorkflowStep;
  status: CodingWorkflowStatus;
  reviewIteration: number;
  maxReviewIterations: number;
  logs: string[];
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function createCodingWorkflowRunId(): string {
  return `wf-run-${crypto.randomUUID()}`;
}

export interface StartCodingWorkflowInput {
  taskId: string;
  maxReviewIterations?: number;
}

export interface AdvanceCodingWorkflowInput {
  runId: string;
  approved?: boolean;
  testsPassed?: boolean;
  reviewPassed?: boolean;
  note?: string;
}

export interface CodingWorkflowRunIdInput {
  runId: string;
}

export function parseStartCodingWorkflowInput(value: unknown): StartCodingWorkflowInput | null {
  if (!isDynamicRecord(value) || !isString(value.taskId)) return null;
  const input: StartCodingWorkflowInput = { taskId: value.taskId };
  if (value.maxReviewIterations !== undefined) {
    if (typeof value.maxReviewIterations !== "number" || value.maxReviewIterations < 1) return null;
    input.maxReviewIterations = value.maxReviewIterations;
  }
  return input;
}

export function parseAdvanceCodingWorkflowInput(value: unknown): AdvanceCodingWorkflowInput | null {
  if (!isDynamicRecord(value) || !isString(value.runId)) return null;
  const input: AdvanceCodingWorkflowInput = { runId: value.runId };
  if (value.approved !== undefined) {
    if (!isBoolean(value.approved)) return null;
    input.approved = value.approved;
  }
  if (value.testsPassed !== undefined) {
    if (!isBoolean(value.testsPassed)) return null;
    input.testsPassed = value.testsPassed;
  }
  if (value.reviewPassed !== undefined) {
    if (!isBoolean(value.reviewPassed)) return null;
    input.reviewPassed = value.reviewPassed;
  }
  if (value.note !== undefined) {
    if (!isString(value.note)) return null;
    input.note = value.note;
  }
  return input;
}

export function parseCodingWorkflowRunIdInput(value: unknown): CodingWorkflowRunIdInput | null {
  return isDynamicRecord(value) && isString(value.runId) ? { runId: value.runId } : null;
}

function parseCodingWorkflowRun(row: DynamicRecord): CodingWorkflowRun | null {
  if (
    !isString(row.id) ||
    !isString(row.taskId) ||
    !isString(row.projectId) ||
    !isString(row.repositoryId) ||
    !isNullableString(row.worktreeId) ||
    !isOneOf(CODING_WORKFLOW_STEP_VALUES, row.currentStep) ||
    !isOneOf(CODING_WORKFLOW_STATUS_VALUES, row.status) ||
    typeof row.reviewIteration !== "number" ||
    typeof row.maxReviewIterations !== "number" ||
    !Array.isArray(row.logs) ||
    !isNullableString(row.failureReason) ||
    !isString(row.createdAt) ||
    !isString(row.updatedAt)
  )
    return null;
  const logs: string[] = [];
  for (const entry of row.logs) {
    if (!isString(entry)) return null;
    logs.push(entry);
  }
  return {
    id: row.id,
    taskId: row.taskId,
    projectId: row.projectId,
    repositoryId: row.repositoryId,
    worktreeId: row.worktreeId,
    currentStep: row.currentStep,
    status: row.status,
    reviewIteration: row.reviewIteration,
    maxReviewIterations: row.maxReviewIterations,
    logs,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function parseCodingWorkflowRunResult(value: unknown): CodingWorkflowRun | null {
  return isDynamicRecord(value) ? parseCodingWorkflowRun(value) : null;
}

export function parseCodingWorkflowRunList(value: unknown): CodingWorkflowRun[] | null {
  if (!Array.isArray(value)) return null;
  const runs: CodingWorkflowRun[] = [];
  for (const item of value) {
    if (!isDynamicRecord(item)) return null;
    const run = parseCodingWorkflowRun(item);
    if (!run) return null;
    runs.push(run);
  }
  return runs;
}

export interface ProjectFileMatch {
  path: string;
  relativePath: string;
  rootName: string;
  rootPath: string;
}

export interface SearchProjectFilesInput {
  projectId?: string | null;
  threadId?: string | null;
  query: string;
  limit?: number;
}

export function parseSearchProjectFilesInput(value: unknown): SearchProjectFilesInput | null {
  if (!isDynamicRecord(value) || !isString(value.query)) return null;
  const input: SearchProjectFilesInput = { query: value.query };
  if (value.projectId !== undefined) {
    if (!isNullableString(value.projectId)) return null;
    input.projectId = value.projectId;
  }
  if (value.threadId !== undefined) {
    if (!isNullableString(value.threadId)) return null;
    input.threadId = value.threadId;
  }
  if (value.limit !== undefined) {
    if (typeof value.limit !== "number" || !Number.isFinite(value.limit)) return null;
    input.limit = value.limit;
  }
  return input;
}

export function parseProjectFileMatchList(value: unknown): ProjectFileMatch[] | null {
  if (!Array.isArray(value)) return null;
  const matches: ProjectFileMatch[] = [];
  for (const item of value) {
    if (
      !isDynamicRecord(item) ||
      !isString(item.path) ||
      !isString(item.relativePath) ||
      !isString(item.rootName) ||
      !isString(item.rootPath)
    )
      return null;
    matches.push({
      path: item.path,
      relativePath: item.relativePath,
      rootName: item.rootName,
      rootPath: item.rootPath,
    });
  }
  return matches;
}
