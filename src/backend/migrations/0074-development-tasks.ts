import type { OpenBotMigration } from "./migration";

const DEVELOPMENT_TASKS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS projection_development_tasks (
    task_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projection_projects(project_id) ON DELETE CASCADE,
    repository_id TEXT REFERENCES projection_repositories(repository_id) ON DELETE SET NULL,
    parent_task_id TEXT REFERENCES projection_development_tasks(task_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    acceptance_criteria TEXT NOT NULL DEFAULT '',
    task_type TEXT NOT NULL DEFAULT 'feature' CHECK(task_type IN (
      'feature', 'bug', 'refactor', 'documentation', 'research', 'testing', 'security', 'infrastructure', 'maintenance'
    )),
    priority TEXT NOT NULL DEFAULT 'p2' CHECK(priority IN ('p0', 'p1', 'p2', 'p3')),
    status TEXT NOT NULL DEFAULT 'backlog' CHECK(status IN (
      'backlog', 'ready', 'planning', 'in-progress', 'testing', 'in-review', 'changes-requested',
      'blocked', 'ready-to-merge', 'done', 'cancelled'
    )),
    assigned_agent_id TEXT,
    worktree_id TEXT REFERENCES projection_worktrees(worktree_id) ON DELETE SET NULL,
    external_issue_ref TEXT,
    external_pr_ref TEXT,
    blocker_reason TEXT,
    test_evidence TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    archived_at TEXT
  );
  CREATE INDEX IF NOT EXISTS development_tasks_project ON projection_development_tasks(project_id);
  CREATE INDEX IF NOT EXISTS development_tasks_repository ON projection_development_tasks(repository_id);
  CREATE INDEX IF NOT EXISTS development_tasks_status ON projection_development_tasks(status);

  CREATE TABLE IF NOT EXISTS development_task_dependencies (
    task_id TEXT NOT NULL REFERENCES projection_development_tasks(task_id) ON DELETE CASCADE,
    depends_on_task_id TEXT NOT NULL REFERENCES projection_development_tasks(task_id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_task_id),
    CHECK (task_id <> depends_on_task_id)
  );
`;

export const DEVELOPMENT_TASKS_TABLES_AFTER_MIGRATION: Record<string, never[]> = {
  projection_development_tasks: [],
  development_task_dependencies: [],
};

export const migration: OpenBotMigration = {
  version: 74,
  name: "development-tasks",
  up: (db) => db.exec(DEVELOPMENT_TASKS_SCHEMA_SQL),
};
