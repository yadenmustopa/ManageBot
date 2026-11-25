import { databaseRow, optionalStringColumn } from "../database/database-rows";
import { withTransaction } from "../database/sqlite-transaction";
import type { OpenBotDatabase } from "../openbot-database";

export interface ThreadRepositoryScope {
  readonly projectId: string | null;
  readonly repositoryId: string | null;
}

const UNSCOPED: ThreadRepositoryScope = { projectId: null, repositoryId: null };

/**
 * Reads/writes `thread_repository_scope` (migration 0071). This is the PRD FR-05 "coding session"
 * association: the thread is the stable conversation identity (provider sessions under
 * `projection_provider_sessions` are recreated across restarts/provider switches, the thread is
 * not), so the scope is keyed by thread_id — in its own table, not new columns on
 * `projection_threads` itself (see the migration file for why).
 *
 * A thread with no row here is "unscoped" — `repository-context-resolver.ts` treats that
 * identically to a thread that was never associated with a repository at all.
 */
export class ThreadRepositoryScopeStore {
  constructor(private readonly database: OpenBotDatabase) {}

  getScope(threadId: string): ThreadRepositoryScope {
    const row = databaseRow(
      this.database.connection
        .prepare("SELECT project_id, repository_id FROM thread_repository_scope WHERE thread_id = ?")
        .get(threadId),
    );
    if (!row) return UNSCOPED;
    return {
      projectId: optionalStringColumn(row, "project_id"),
      repositoryId: optionalStringColumn(row, "repository_id"),
    };
  }

  /** Associates (or clears, when repositoryId is null) a thread's project/repository scope. */
  setScope(
    threadId: string,
    projectId: string | null,
    repositoryId: string | null,
    now = new Date().toISOString(),
  ): void {
    const db = this.database.connection;
    withTransaction(db, () => {
      db.prepare(
        `INSERT INTO thread_repository_scope (thread_id, project_id, repository_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(thread_id) DO UPDATE SET project_id = excluded.project_id,
           repository_id = excluded.repository_id, updated_at = excluded.updated_at`,
      ).run(threadId, projectId, repositoryId, now, now);
    });
  }
}
