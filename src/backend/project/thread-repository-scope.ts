import type { ProjectSessionSummary } from "@openbot/contracts/project";
import { databaseRow, databaseRows, optionalStringColumn, requiredStringColumn } from "../database/database-rows";
import { withTransaction } from "../database/sqlite-transaction";
import type { OpenBotDatabase } from "../openbot-database";

export interface ThreadRepositoryScope {
  readonly projectId: string | null;
  readonly repositoryId: string | null;
  /** Phase 3: non-null only when the thread is scoped to one specific worktree, not the repo root. */
  readonly worktreeId: string | null;
}

const UNSCOPED: ThreadRepositoryScope = { projectId: null, repositoryId: null, worktreeId: null };

/**
 * Reads/writes `thread_repository_scope` (migration 0071, `worktree_id` added by migration 0073).
 * This is the PRD FR-05 "coding session" association: the thread is the stable conversation
 * identity (provider sessions under `projection_provider_sessions` are recreated across
 * restarts/provider switches, the thread is not), so the scope is keyed by thread_id — in its own
 * table, not new columns on `projection_threads` itself (see the migration file for why).
 *
 * A thread with no row here is "unscoped" — `repository-context-resolver.ts` treats that
 * identically to a thread that was never associated with a repository at all.
 */
export class ThreadRepositoryScopeStore {
  constructor(private readonly database: OpenBotDatabase) {}

  getScope(threadId: string): ThreadRepositoryScope {
    const row = databaseRow(
      this.database.connection
        .prepare("SELECT project_id, repository_id, worktree_id FROM thread_repository_scope WHERE thread_id = ?")
        .get(threadId),
    );
    if (!row) return UNSCOPED;
    return {
      projectId: optionalStringColumn(row, "project_id"),
      repositoryId: optionalStringColumn(row, "repository_id"),
      worktreeId: optionalStringColumn(row, "worktree_id"),
    };
  }

  /**
   * Associates (or clears, when repositoryId is null) a thread's project/repository/worktree
   * scope. `worktreeId` defaults to clearing any existing worktree scope when omitted, since every
   * call site that only knows about a repository (Phase 2's `agent-actions.tsx`) should not need to
   * pass `null` explicitly to avoid leaving a stale worktree scope behind.
   */
  setScope(
    threadId: string,
    projectId: string | null,
    repositoryId: string | null,
    worktreeId: string | null = null,
    now = new Date().toISOString(),
  ): void {
    const db = this.database.connection;
    withTransaction(db, () => {
      db.prepare(
        `INSERT INTO thread_repository_scope (thread_id, project_id, repository_id, worktree_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(thread_id) DO UPDATE SET project_id = excluded.project_id,
           repository_id = excluded.repository_id, worktree_id = excluded.worktree_id,
           updated_at = excluded.updated_at`,
      ).run(threadId, projectId, repositoryId, worktreeId, now, now);
    });
  }

  listSessionsForProject(projectId: string): ProjectSessionSummary[] {
    return databaseRows(
      this.database.connection
        .prepare(
          `SELECT s.thread_id, s.repository_id, s.worktree_id,
                  t.agent_id, t.title, t.updated_at,
                  COALESCE(json_extract(a.agent_json, '$.name'), t.agent_id) AS agent_name
           FROM thread_repository_scope s
           JOIN projection_threads t ON t.thread_id = s.thread_id
           LEFT JOIN projection_agents a ON a.agent_id = t.agent_id
           WHERE s.project_id = ?
           ORDER BY t.updated_at DESC
           LIMIT 100`,
        )
        .all(projectId),
    ).map((row) => ({
      threadId: requiredStringColumn(row, "thread_id"),
      agentId: requiredStringColumn(row, "agent_id"),
      agentName: requiredStringColumn(row, "agent_name"),
      title: requiredStringColumn(row, "title"),
      repositoryId: optionalStringColumn(row, "repository_id"),
      worktreeId: optionalStringColumn(row, "worktree_id"),
      updatedAt: requiredStringColumn(row, "updated_at"),
    }));
  }
}
