import { createSignal } from "solid-js";

export interface PendingRepositorySession {
  projectId: string;
  repositoryId: string;
}

/**
 * Bridges "New coding session" (`ProjectDashboard`, inside `AgentsProvider`'s subtree) to
 * `agent-actions.tsx`'s `createAgent` (a sibling context in the same subtree, not a descendant of
 * `ProjectsProvider`'s own context) without threading a prop through the whole agent-creation flow
 * for one feature. Module-level singleton, same reasoning as `projectsOpen` in `project-context.tsx`.
 */
const [pendingRepositorySession, setPendingRepositorySession] = createSignal<PendingRepositorySession | null>(null);

export function requestRepositorySession(projectId: string, repositoryId: string): void {
  setPendingRepositorySession({ projectId, repositoryId });
}

/** Reads and clears the pending request in one step, so it is applied at most once. */
export function consumePendingRepositorySession(): PendingRepositorySession | null {
  const pending = pendingRepositorySession();
  if (pending) setPendingRepositorySession(null);
  return pending;
}
