import { stat } from "node:fs/promises";
import type { AgentSummary } from "@openbot/contracts/ipc";
import { LOCAL_HOST_ID } from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import { Effect, Schema } from "effect";
import { existingAgentFolders, workspaceWritableRoots } from "../agent/workspace-sandbox";
import { databaseRow, requiredStringColumn } from "../database/database-rows";
import type { OpenBotDatabase } from "../openbot-database";
import { inspectGitRepository } from "./git-inspect";
import { ThreadRepositoryScopeStore } from "./thread-repository-scope";

/**
 * Same `{ cause: Schema.Defect() }` shape as `McpOperationError`/`ThreadOperationFailed`, so a call
 * site can fold it into its own tagged error with `.pipe(toThreadOperationFailed)` exactly like
 * every other failure mode in `thread-lifecycle.ts` — no new error channel.
 */
export class RepositoryContextError extends Schema.TaggedError<RepositoryContextError>()("RepositoryContextError", {
  cause: Schema.Defect(),
}) {}

function repositoryContextFailure(message: string) {
  return Effect.fail(new RepositoryContextError({ cause: message }));
}

export interface AgentExecutionContext {
  readonly cwd: string;
  readonly writableRoots: readonly string[];
  readonly repositoryId: string | null;
  readonly projectFolders?: readonly string[];
}

type ScopableAgent = Pick<AgentSummary, "id" | "additionalFolders" | "workspacePath">;

/**
 * Resolves the working directory + writable roots used when a provider session/turn starts
 * (PRD FR-04). Pure function of (thread's stored repository scope, agent, sharedRoot) — call it
 * once per session/turn start, not mid-turn (PRD 8.4 "context immutability").
 *
 * The load-bearing guarantee: a thread with no repository association (the overwhelming majority
 * of threads today, and every thread that existed before Phase 2) resolves to exactly
 * `{ cwd: agent.workspacePath, writableRoots: workspaceWritableRoots(agent, sharedRoot), repositoryId: null }`
 * — the same value every one of the four call sites computed before this resolver existed. Nothing
 * about an unscoped agent's behavior changes.
 *
 * A thread that IS associated with a repository never silently falls back: a missing directory or
 * a folder that is no longer a Git working tree fails the effect explicitly (PRD FR-04 acceptance:
 * "A missing repository produces a visible error rather than falling back to an unrelated
 * directory").
 */
export const resolveAgentExecutionContext = Effect.fn("resolveAgentExecutionContext")(function* (
  database: OpenBotDatabase,
  agent: ScopableAgent,
  threadId: string | null | undefined,
  sharedRoot: string,
) {
  const fallback: AgentExecutionContext = {
    cwd: agent.workspacePath,
    writableRoots: workspaceWritableRoots(agent, sharedRoot),
    repositoryId: null,
  };
  if (!threadId) return fallback;

  const scope = new ThreadRepositoryScopeStore(database).getScope(threadId);
  if (!scope.repositoryId) return fallback;

  const repository = databaseRepository(database, scope.repositoryId);
  if (!repository) return yield* repositoryContextFailure(sourceText("error.backend.repositoryGone"));
  if (repository.hostId !== LOCAL_HOST_ID) {
    return yield* repositoryContextFailure(sourceText("error.backend.repositoryRemoteHostUnavailable"));
  }

  // Phase 3: a thread scoped to a specific worktree (migration 0073's `worktree_id`) resolves to
  // that worktree's path instead of the repository root. Checked and verified the same way as the
  // repository itself just below — a worktree that should exist but doesn't fails explicitly, it
  // never silently falls back to the repository root (same discipline as the repository check).
  if (scope.worktreeId) {
    const worktree = databaseWorktree(database, scope.worktreeId);
    if (!worktree || worktree.repositoryId !== repository.id)
      return yield* repositoryContextFailure(sourceText("error.backend.worktreeGone"));

    const worktreeIsDirectory = yield* Effect.promise(() =>
      stat(worktree.canonicalPath).then(
        (info) => info.isDirectory(),
        () => false,
      ),
    );
    if (!worktreeIsDirectory) return yield* repositoryContextFailure(sourceText("error.backend.worktreePathMissing"));

    const worktreeInspection = yield* Effect.promise(() => inspectGitRepository(worktree.canonicalPath));
    if (!worktreeInspection.isWorkingTree)
      return yield* repositoryContextFailure(sourceText("error.backend.repositoryNotGitWorkingTree"));

    return {
      cwd: worktree.canonicalPath,
      writableRoots: [worktree.canonicalPath, sharedRoot, ...existingAgentFolders(agent)],
      repositoryId: repository.id,
      projectFolders: yield* projectFolderPaths(database, repository.id, worktree.canonicalPath),
    } satisfies AgentExecutionContext;
  }

  const isDirectory = yield* Effect.promise(() =>
    stat(repository.canonicalPath).then(
      (info) => info.isDirectory(),
      () => false,
    ),
  );
  if (!isDirectory) return yield* repositoryContextFailure(sourceText("error.backend.repositoryPathMissing"));

  return {
    cwd: repository.canonicalPath,
    writableRoots: [repository.canonicalPath, sharedRoot, ...existingAgentFolders(agent)],
    repositoryId: repository.id,
    projectFolders: yield* projectFolderPaths(database, repository.id, repository.canonicalPath),
  } satisfies AgentExecutionContext;
});

const projectFolderPaths = Effect.fn("projectFolderPaths")(function* (
  database: OpenBotDatabase,
  repositoryId: string,
  primaryPath: string,
) {
  const siblingPaths = databaseProjectSiblingFolders(database, repositoryId, primaryPath);
  const existingSiblings = yield* Effect.promise(() =>
    Promise.all(
      siblingPaths.map((folder) =>
        stat(folder).then(
          (info) => (info.isDirectory() ? folder : null),
          () => null,
        ),
      ),
    ),
  );
  return [...new Set([primaryPath, ...existingSiblings.filter((folder): folder is string => folder !== null)])];
});

function databaseProjectSiblingFolders(database: OpenBotDatabase, repositoryId: string, primaryPath: string): string[] {
  const rows = database.connection
    .prepare(
      `SELECT DISTINCT r.canonical_path
       FROM projection_repositories r
       JOIN project_repositories pr1 ON pr1.repository_id = r.repository_id
       JOIN project_repositories pr2 ON pr2.project_id = pr1.project_id
       WHERE pr2.repository_id = ?
         AND r.host_id = ?
         AND r.canonical_path != ?`,
    )
    .all(repositoryId, LOCAL_HOST_ID, primaryPath);
  const paths: string[] = [];
  for (const row of rows) {
    const parsed = databaseRow(row);
    if (parsed) paths.push(requiredStringColumn(parsed, "canonical_path"));
  }
  return paths;
}

function databaseRepository(
  database: OpenBotDatabase,
  repositoryId: string,
): { id: string; hostId: string; canonicalPath: string } | null {
  // Avoids a circular import with repository-store.ts's own error-throwing accessors: this
  // resolver needs a non-throwing lookup it can turn into an explicit Effect failure instead.
  const row = databaseRow(
    database.connection
      .prepare("SELECT repository_id, host_id, canonical_path FROM projection_repositories WHERE repository_id = ?")
      .get(repositoryId),
  );
  if (!row) return null;
  return {
    id: requiredStringColumn(row, "repository_id"),
    hostId: requiredStringColumn(row, "host_id"),
    canonicalPath: requiredStringColumn(row, "canonical_path"),
  };
}

function databaseWorktree(
  database: OpenBotDatabase,
  worktreeId: string,
): { repositoryId: string; canonicalPath: string } | null {
  // Same non-throwing-lookup reasoning as `databaseRepository` above, to avoid a circular import
  // with worktree-store.ts's error-throwing accessors.
  const row = databaseRow(
    database.connection
      .prepare("SELECT repository_id, canonical_path FROM projection_worktrees WHERE worktree_id = ?")
      .get(worktreeId),
  );
  if (!row) return null;
  return {
    repositoryId: requiredStringColumn(row, "repository_id"),
    canonicalPath: requiredStringColumn(row, "canonical_path"),
  };
}
