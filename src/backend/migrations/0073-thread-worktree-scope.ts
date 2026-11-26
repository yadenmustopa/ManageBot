import type { DatabaseSync } from "node:sqlite";
import type { OpenBotMigration } from "./migration";
import { isDynamicRecord } from "./runtime-values";

// OpenBot Dev Workspace Phase 3: lets a thread's repository scope (migration 0071) narrow further
// to one specific worktree, so its session's working directory resolves to that worktree's path
// instead of the repository's primary working tree (`repository-context-resolver.ts`).
//
// A new nullable column on `thread_repository_scope`, not a new table: unlike `projection_threads`
// (which dozens of unrelated migration tests snapshot row-for-row — see migration 0071's own
// comment for why that table gets no new columns), `thread_repository_scope` is itself new as of
// this fork and has no such snapshot tests to burden. `ON DELETE SET NULL` matches the existing
// `repository_id` column: removing a worktree un-scopes affected threads back to the repository
// root rather than leaving a dangling reference.
function addThreadWorktreeScope(db: DatabaseSync): void {
  // Same "a development profile that ran this version before it shipped has the column already"
  // guard as migration 0048: ADD COLUMN has no IF NOT EXISTS form in SQLite, and a retry after an
  // earlier migration's failure (see migration-harness.ts / agent-usage-migration.test.ts's
  // "rolls back a failed migration" case) re-runs every migration from the failed one forward,
  // including ones, like this one, whose physical change already committed.
  const columns = db.prepare("PRAGMA table_info(thread_repository_scope)").all();
  const hasWorktreeId = columns.some((column) => isDynamicRecord(column) && column.name === "worktree_id");
  if (!hasWorktreeId) {
    db.exec(
      "ALTER TABLE thread_repository_scope ADD COLUMN worktree_id TEXT REFERENCES projection_worktrees(worktree_id) ON DELETE SET NULL",
    );
  }
  db.exec("CREATE INDEX IF NOT EXISTS thread_repository_scope_worktree ON thread_repository_scope(worktree_id)");
}

export const migration: OpenBotMigration = {
  version: 73,
  name: "thread-worktree-scope",
  // Adds one nullable column with no default requiring a rewrite, plus an index: no foreign-key
  // pause and no vacuum, same reasoning as v38/v48/v70/v71/v72.
  up: addThreadWorktreeScope,
};
