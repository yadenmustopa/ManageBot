import type { OpenBotMigration } from "./migration";

// OpenBot Dev Workspace Phase 2 (FR-04/FR-05): associates a thread (the stable conversation
// identity a "coding session" maps to in this codebase — provider sessions under
// `projection_provider_sessions` are recreated across restarts/provider switches, the thread is
// not) with an optional project/repository.
//
// A standalone table, not new columns on `projection_threads` itself: `projection_threads` rows
// are snapshotted verbatim ("preserves every row from released schema N") by dozens of unrelated
// migration tests, so widening that table's own shape would make every one of them responsible
// for a Phase-2 column they have nothing to do with. A join-style table keyed by `thread_id` (same
// shape as Phase 1's `project_repositories`) is both less invasive and the better fit: an unscoped
// thread simply has no row here at all, which is exactly the "unscoped" case
// `repository-context-resolver.ts` already treats as the default.
const THREAD_REPOSITORY_SCOPE_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS thread_repository_scope (
    thread_id TEXT PRIMARY KEY REFERENCES projection_threads(thread_id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projection_projects(project_id) ON DELETE SET NULL,
    repository_id TEXT REFERENCES projection_repositories(repository_id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS thread_repository_scope_repository ON thread_repository_scope(repository_id);
`;

/** The one table right after migration 71, for the migration tests of earlier versions. */
export const THREAD_REPOSITORY_SCOPE_TABLES_AFTER_MIGRATION: Record<string, never[]> = {
  thread_repository_scope: [],
};

export const migration: OpenBotMigration = {
  version: 71,
  name: "thread-repository-scope",
  // Only creates a table, so no foreign-key pause and no vacuum: identical reasoning to v38/v70.
  up: (db) => db.exec(THREAD_REPOSITORY_SCOPE_SCHEMA_SQL),
};
