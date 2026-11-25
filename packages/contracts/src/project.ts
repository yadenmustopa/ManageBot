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
}

export function parseSetThreadRepositoryScopeInput(value: unknown): SetThreadRepositoryScopeInput | null {
  if (!isDynamicRecord(value) || !isString(value.threadId)) return null;
  if (!isNullableString(value.projectId) || !isNullableString(value.repositoryId)) return null;
  return { threadId: value.threadId, projectId: value.projectId, repositoryId: value.repositoryId };
}

export function parseThreadRepositoryScope(value: unknown): ThreadRepositoryScope | null {
  if (!isDynamicRecord(value) || !isString(value.threadId)) return null;
  if (!isNullableString(value.projectId) || !isNullableString(value.repositoryId)) return null;
  return { threadId: value.threadId, projectId: value.projectId, repositoryId: value.repositoryId };
}
