import {
  type CreateProjectInput,
  createProjectId,
  createWorkspaceId,
  type OpenBotProject,
  type OpenBotWorkspace,
  type UpdateProjectInput,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import { databaseRow, databaseRows, requiredNumberColumn, requiredStringColumn } from "../database/database-rows";
import { withTransaction } from "../database/sqlite-transaction";
import type { OpenBotDatabase } from "../openbot-database";

export class ProjectError extends Error {}

const DEFAULT_WORKSPACE_NAME = "My Workspace";
const PROJECT_LIMIT = 500;

function workspaceRow(row: ReturnType<typeof databaseRow>): OpenBotWorkspace {
  if (!row) throw new ProjectError(sourceText("error.backend.projectWorkspaceGone"));
  return {
    id: requiredStringColumn(row, "workspace_id"),
    name: requiredStringColumn(row, "name"),
    createdAt: requiredStringColumn(row, "created_at"),
    updatedAt: requiredStringColumn(row, "updated_at"),
    archivedAt: row.archived_at === null ? null : requiredStringColumn(row, "archived_at"),
  };
}

function projectRow(row: ReturnType<typeof databaseRow>): OpenBotProject {
  if (!row) throw new ProjectError(sourceText("error.backend.projectGone"));
  return {
    id: requiredStringColumn(row, "project_id"),
    workspaceId: requiredStringColumn(row, "workspace_id"),
    name: requiredStringColumn(row, "name"),
    description: requiredStringColumn(row, "description"),
    icon: row.icon === null ? null : requiredStringColumn(row, "icon"),
    color: row.color === null ? null : requiredStringColumn(row, "color"),
    pinned: requiredNumberColumn(row, "pinned") === 1,
    sortOrder: requiredNumberColumn(row, "sort_order"),
    createdAt: requiredStringColumn(row, "created_at"),
    updatedAt: requiredStringColumn(row, "updated_at"),
    archivedAt: row.archived_at === null ? null : requiredStringColumn(row, "archived_at"),
  };
}

/**
 * Direct CRUD on `projection_workspaces` / `projection_projects`, the same shape as
 * `McpServerStore`: these are config-style entities with nothing to replay, so there is no
 * `orchestration_events` entry per write (see `migrations/0070-projects.ts`).
 */
export class ProjectStore {
  constructor(private readonly database: OpenBotDatabase) {}

  /** For MVP (PRD FR-01): a single default workspace, created once and reused. */
  ensureDefaultWorkspace(now = new Date().toISOString()): OpenBotWorkspace {
    const db = this.database.connection;
    return withTransaction(db, () => {
      const existing = databaseRow(db.prepare("SELECT * FROM projection_workspaces ORDER BY created_at LIMIT 1").get());
      if (existing) return workspaceRow(existing);
      const workspace: OpenBotWorkspace = {
        id: createWorkspaceId(),
        name: DEFAULT_WORKSPACE_NAME,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      db.prepare(
        "INSERT INTO projection_workspaces (workspace_id, name, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, NULL)",
      ).run(workspace.id, workspace.name, now, now);
      return workspace;
    });
  }

  listWorkspaces(): OpenBotWorkspace[] {
    return databaseRows(
      this.database.connection.prepare("SELECT * FROM projection_workspaces ORDER BY created_at").all(),
    ).map((row) => workspaceRow(row));
  }

  listProjects(workspaceId: string, options: { includeArchived?: boolean } = {}): OpenBotProject[] {
    const sql = options.includeArchived
      ? "SELECT * FROM projection_projects WHERE workspace_id = ? ORDER BY sort_order, created_at"
      : "SELECT * FROM projection_projects WHERE workspace_id = ? AND archived_at IS NULL ORDER BY sort_order, created_at";
    return databaseRows(this.database.connection.prepare(sql).all(workspaceId)).map((row) => projectRow(row));
  }

  getProject(projectId: string): OpenBotProject | null {
    const row = databaseRow(
      this.database.connection.prepare("SELECT * FROM projection_projects WHERE project_id = ?").get(projectId),
    );
    return row ? projectRow(row) : null;
  }

  requireProject(projectId: string): OpenBotProject {
    const project = this.getProject(projectId);
    if (!project) throw new ProjectError(sourceText("error.backend.projectGone"));
    return project;
  }

  createProject(input: CreateProjectInput, now = new Date().toISOString()): OpenBotProject {
    const db = this.database.connection;
    return withTransaction(db, () => {
      const workspace = databaseRow(
        db.prepare("SELECT workspace_id FROM projection_workspaces WHERE workspace_id = ?").get(input.workspaceId),
      );
      if (!workspace) throw new ProjectError(sourceText("error.backend.projectWorkspaceGone"));
      const count = requiredNumberColumn(
        databaseRow(
          db.prepare("SELECT COUNT(*) AS count FROM projection_projects WHERE workspace_id = ?").get(input.workspaceId),
        ) ?? { count: 0 },
        "count",
      );
      if (count >= PROJECT_LIMIT)
        throw new ProjectError(sourceText("error.backend.projectLimit", { limit: PROJECT_LIMIT }));
      const nextOrder = requiredNumberColumn(
        databaseRow(
          db
            .prepare("SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM projection_projects WHERE workspace_id = ?")
            .get(input.workspaceId),
        ) ?? { next: 0 },
        "next",
      );
      const project: OpenBotProject = {
        id: createProjectId(),
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? "",
        icon: input.icon ?? null,
        color: input.color ?? null,
        pinned: false,
        sortOrder: nextOrder,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      db.prepare(
        `INSERT INTO projection_projects (
           project_id, workspace_id, name, description, icon, color, pinned, sort_order,
           created_at, updated_at, archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL)`,
      ).run(
        project.id,
        project.workspaceId,
        project.name,
        project.description,
        project.icon,
        project.color,
        project.sortOrder,
        now,
        now,
      );
      return project;
    });
  }

  updateProject(input: UpdateProjectInput, now = new Date().toISOString()): OpenBotProject {
    const db = this.database.connection;
    return withTransaction(db, () => {
      const current = this.requireProject(input.projectId);
      const next: OpenBotProject = {
        ...current,
        name: input.name ?? current.name,
        description: input.description ?? current.description,
        icon: input.icon === undefined ? current.icon : input.icon,
        color: input.color === undefined ? current.color : input.color,
        pinned: input.pinned ?? current.pinned,
        updatedAt: now,
      };
      db.prepare(
        `UPDATE projection_projects SET name = ?, description = ?, icon = ?, color = ?, pinned = ?, updated_at = ?
         WHERE project_id = ?`,
      ).run(next.name, next.description, next.icon, next.color, next.pinned ? 1 : 0, now, next.id);
      return next;
    });
  }

  archiveProject(projectId: string, now = new Date().toISOString()): void {
    const db = this.database.connection;
    withTransaction(db, () => {
      this.requireProject(projectId);
      db.prepare("UPDATE projection_projects SET archived_at = ?, updated_at = ? WHERE project_id = ?").run(
        now,
        now,
        projectId,
      );
    });
  }

  restoreProject(projectId: string, now = new Date().toISOString()): void {
    const db = this.database.connection;
    withTransaction(db, () => {
      this.requireProject(projectId);
      db.prepare("UPDATE projection_projects SET archived_at = NULL, updated_at = ? WHERE project_id = ?").run(
        now,
        projectId,
      );
    });
  }

  reorderProjects(workspaceId: string, orderedProjectIds: readonly string[], now = new Date().toISOString()): void {
    const db = this.database.connection;
    withTransaction(db, () => {
      orderedProjectIds.forEach((projectId, index) => {
        db.prepare(
          "UPDATE projection_projects SET sort_order = ?, updated_at = ? WHERE project_id = ? AND workspace_id = ?",
        ).run(index, now, projectId, workspaceId);
      });
    });
  }
}
