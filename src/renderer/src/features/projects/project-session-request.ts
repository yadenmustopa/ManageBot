import { createSignal } from "solid-js";

export interface PendingRepositorySession {
  projectId: string;
  repositoryId: string;
  worktreeId: string | null;
}

const [pendingRepositorySession, setPendingRepositorySession] = createSignal<PendingRepositorySession | null>(null);

export function requestRepositorySession(
  projectId: string,
  repositoryId: string,
  worktreeId: string | null = null,
): void {
  setPendingRepositorySession({ projectId, repositoryId, worktreeId });
}

/** Reads and clears the pending request in one step, so it is applied at most once. */
export function consumePendingRepositorySession(): PendingRepositorySession | null {
  const pending = pendingRepositorySession();
  if (pending) setPendingRepositorySession(null);
  return pending;
}
