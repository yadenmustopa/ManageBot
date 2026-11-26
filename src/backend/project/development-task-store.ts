import {
  type CreateDevelopmentTaskInput,
  createDevelopmentTaskId,
  DEVELOPMENT_TASK_PRIORITY_VALUES,
  DEVELOPMENT_TASK_STATUS_VALUES,
  DEVELOPMENT_TASK_TYPE_VALUES,
  type DevelopmentTaskType,
  type OpenBotDevelopmentTask,
  type UpdateDevelopmentTaskInput,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import {
  checkedColumn,
  databaseRow,
  databaseRows,
  optionalStringColumn,
  requiredStringColumn,
} from "../database/database-rows";
import { withTransaction } from "../database/sqlite-transaction";
import type { OpenBotDatabase } from "../openbot-database";

export class DevelopmentTaskError extends Error {}

const NON_CODE_TASK_TYPES = new Set<DevelopmentTaskType>(["research", "documentation"]);

function taskRow(row: ReturnType<typeof databaseRow>): OpenBotDevelopmentTask {
  if (!row) throw new DevelopmentTaskError(sourceText("error.backend.taskGone"));
  return {
    id: requiredStringColumn(row, "task_id"),
    projectId: requiredStringColumn(row, "project_id"),
    repositoryId: optionalStringColumn(row, "repository_id"),
    parentTaskId: optionalStringColumn(row, "parent_task_id"),
    title: requiredStringColumn(row, "title"),
    description: requiredStringColumn(row, "description"),
    acceptanceCriteria: requiredStringColumn(row, "acceptance_criteria"),
    taskType: checkedColumn(row, "task_type", DEVELOPMENT_TASK_TYPE_VALUES),
    priority: checkedColumn(row, "priority", DEVELOPMENT_TASK_PRIORITY_VALUES),
    status: checkedColumn(row, "status", DEVELOPMENT_TASK_STATUS_VALUES),
    assignedAgentId: optionalStringColumn(row, "assigned_agent_id"),
    worktreeId: optionalStringColumn(row, "worktree_id"),
    externalIssueRef: optionalStringColumn(row, "external_issue_ref"),
    externalPrRef: optionalStringColumn(row, "external_pr_ref"),
    blockerReason: optionalStringColumn(row, "blocker_reason"),
    testEvidence: optionalStringColumn(row, "test_evidence"),
    createdAt: requiredStringColumn(row, "created_at"),
    updatedAt: requiredStringColumn(row, "updated_at"),
    completedAt: optionalStringColumn(row, "completed_at"),
    archivedAt: optionalStringColumn(row, "archived_at"),
  };
}

export class DevelopmentTaskStore {
  constructor(private readonly database: OpenBotDatabase) {}

  createTask(input: CreateDevelopmentTaskInput, now = new Date().toISOString()): OpenBotDevelopmentTask {
    const title = input.title.trim();
    if (title.length === 0) throw new DevelopmentTaskError(sourceText("error.backend.taskTitleInvalid"));
    const db = this.database.connection;
    const task: OpenBotDevelopmentTask = {
      id: createDevelopmentTaskId(),
      projectId: input.projectId,
      repositoryId: input.repositoryId ?? null,
      parentTaskId: input.parentTaskId ?? null,
      title,
      description: (input.description ?? "").trim(),
      acceptanceCriteria: (input.acceptanceCriteria ?? "").trim(),
      taskType: input.taskType ?? "feature",
      priority: input.priority ?? "p2",
      status: "backlog",
      assignedAgentId: null,
      worktreeId: null,
      externalIssueRef: null,
      externalPrRef: null,
      blockerReason: null,
      testEvidence: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      archivedAt: null,
    };
    return withTransaction(db, () => {
      db.prepare(
        `INSERT INTO projection_development_tasks (
           task_id, project_id, repository_id, parent_task_id, title, description, acceptance_criteria,
           task_type, priority, status, assigned_agent_id, worktree_id, external_issue_ref, external_pr_ref,
           blocker_reason, test_evidence, created_at, updated_at, completed_at, archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, NULL, NULL)`,
      ).run(
        task.id,
        task.projectId,
        task.repositoryId,
        task.parentTaskId,
        task.title,
        task.description,
        task.acceptanceCriteria,
        task.taskType,
        task.priority,
        task.status,
        task.createdAt,
        task.updatedAt,
      );
      return task;
    });
  }

  listTasksForProject(projectId: string, includeArchived = false): OpenBotDevelopmentTask[] {
    const sql = includeArchived
      ? "SELECT * FROM projection_development_tasks WHERE project_id = ? ORDER BY created_at"
      : "SELECT * FROM projection_development_tasks WHERE project_id = ? AND archived_at IS NULL ORDER BY created_at";
    return databaseRows(this.database.connection.prepare(sql).all(projectId)).map((row) => taskRow(row));
  }

  getTask(taskId: string): OpenBotDevelopmentTask | null {
    const row = databaseRow(
      this.database.connection.prepare("SELECT * FROM projection_development_tasks WHERE task_id = ?").get(taskId),
    );
    return row ? taskRow(row) : null;
  }

  requireTask(taskId: string): OpenBotDevelopmentTask {
    const task = this.getTask(taskId);
    if (!task) throw new DevelopmentTaskError(sourceText("error.backend.taskGone"));
    return task;
  }

  updateTask(input: UpdateDevelopmentTaskInput, now = new Date().toISOString()): OpenBotDevelopmentTask {
    const current = this.requireTask(input.taskId);
    const title = input.title !== undefined ? input.title.trim() : current.title;
    if (title.length === 0) throw new DevelopmentTaskError(sourceText("error.backend.taskTitleInvalid"));

    const taskType = input.taskType ?? current.taskType;
    const status = input.status ?? current.status;
    const testEvidence = input.testEvidence !== undefined ? input.testEvidence : current.testEvidence;

    if (status === "done" && !NON_CODE_TASK_TYPES.has(taskType)) {
      if (!testEvidence || testEvidence.trim().length === 0) {
        throw new DevelopmentTaskError(sourceText("error.backend.taskDoneRequiresEvidence"));
      }
    }

    const completedAt =
      status === "done" ? (current.completedAt ?? now) : input.status !== undefined ? null : current.completedAt;

    const db = this.database.connection;
    return withTransaction(db, () => {
      db.prepare(
        `UPDATE projection_development_tasks SET
           title = ?,
           description = ?,
           acceptance_criteria = ?,
           task_type = ?,
           priority = ?,
           status = ?,
           assigned_agent_id = ?,
           worktree_id = ?,
           external_issue_ref = ?,
           external_pr_ref = ?,
           blocker_reason = ?,
           test_evidence = ?,
           updated_at = ?,
           completed_at = ?
         WHERE task_id = ?`,
      ).run(
        title,
        input.description !== undefined ? input.description.trim() : current.description,
        input.acceptanceCriteria !== undefined ? input.acceptanceCriteria.trim() : current.acceptanceCriteria,
        taskType,
        input.priority ?? current.priority,
        status,
        input.assignedAgentId !== undefined ? input.assignedAgentId : current.assignedAgentId,
        input.worktreeId !== undefined ? input.worktreeId : current.worktreeId,
        input.externalIssueRef !== undefined ? input.externalIssueRef : current.externalIssueRef,
        input.externalPrRef !== undefined ? input.externalPrRef : current.externalPrRef,
        input.blockerReason !== undefined ? input.blockerReason : current.blockerReason,
        testEvidence,
        now,
        completedAt,
        current.id,
      );
      return this.requireTask(current.id);
    });
  }

  archiveTask(taskId: string, now = new Date().toISOString()): void {
    this.requireTask(taskId);
    const db = this.database.connection;
    withTransaction(db, () => {
      db.prepare("UPDATE projection_development_tasks SET archived_at = ?, updated_at = ? WHERE task_id = ?").run(
        now,
        now,
        taskId,
      );
    });
  }

  listDependencies(taskId: string): string[] {
    this.requireTask(taskId);
    return databaseRows(
      this.database.connection
        .prepare("SELECT depends_on_task_id FROM development_task_dependencies WHERE task_id = ?")
        .all(taskId),
    ).map((row) => requiredStringColumn(row, "depends_on_task_id"));
  }

  addDependency(taskId: string, dependsOnTaskId: string): void {
    this.requireTask(taskId);
    this.requireTask(dependsOnTaskId);
    if (taskId === dependsOnTaskId || this.wouldCreateCycle(taskId, dependsOnTaskId)) {
      throw new DevelopmentTaskError(sourceText("error.backend.taskDependencyCycle"));
    }
    const db = this.database.connection;
    withTransaction(db, () => {
      db.prepare("INSERT OR IGNORE INTO development_task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(
        taskId,
        dependsOnTaskId,
      );
    });
  }

  removeDependency(taskId: string, dependsOnTaskId: string): void {
    this.database.connection
      .prepare("DELETE FROM development_task_dependencies WHERE task_id = ? AND depends_on_task_id = ?")
      .run(taskId, dependsOnTaskId);
  }

  private wouldCreateCycle(taskId: string, dependsOnTaskId: string): boolean {
    const visited = new Set<string>();
    const stack = [dependsOnTaskId];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      if (current === taskId) return true;
      visited.add(current);
      const next = databaseRows(
        this.database.connection
          .prepare("SELECT depends_on_task_id FROM development_task_dependencies WHERE task_id = ?")
          .all(current),
      ).map((row) => requiredStringColumn(row, "depends_on_task_id"));
      for (const dep of next) stack.push(dep);
    }
    return false;
  }
}
