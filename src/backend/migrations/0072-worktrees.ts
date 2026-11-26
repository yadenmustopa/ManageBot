import type { OpenBotMigration } from "./migration";

// OpenBot Dev Workspace Phase 3 (FR-09): a registered Git worktree, managed or merely discovered.
//
// Plain config-style projection, same shape as migration 0070's `projection_repositories` — no
// event-sourcing (see that migration's own reasoning, identical here).
//
// `task_id` is nullable and unused until Phase 4 (Development Tasks) exists; the column is here now
// so that phase is additive rather than a rename, per the PRD's own data model (9.2).
const WORKTREES_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS projection_worktrees (
    worktree_id TEXT PRIMARY KEY,
    repository_id TEXT NOT NULL REFERENCES projection_repositories(repository_id) ON DELETE CASCADE,
    host_id TEXT NOT NULL,
    task_id TEXT,
    branch_name TEXT NOT NULL,
    base_ref TEXT,
    canonical_path TEXT NOT NULL,
    managed_by_application INTEGER NOT NULL DEFAULT 1 CHECK(managed_by_application IN (0, 1)),
    lifecycle_status TEXT NOT NULL DEFAULT 'active' CHECK(lifecycle_status IN ('active', 'stale', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS worktrees_host_path ON projection_worktrees(host_id, canonical_path);
  CREATE INDEX IF NOT EXISTS worktrees_repository ON projection_worktrees(repository_id);
`;

/** The one table right after migration 72, for the migration tests of earlier versions. */
export const WORKTREES_TABLES_AFTER_MIGRATION: Record<string, never[]> = {
  projection_worktrees: [],
};

export const migration: OpenBotMigration = {
  version: 72,
  name: "worktrees",
  // Only creates a table, so no foreign-key pause and no vacuum: identical reasoning to v38/v70/v71.
  up: (db) => db.exec(WORKTREES_SCHEMA_SQL),
};
