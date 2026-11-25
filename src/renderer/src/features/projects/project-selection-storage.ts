import { z } from "zod";

const ACTIVE_PROJECT_STORAGE_KEY = "openbot:projects-active:v1";

type ActiveProjectStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const activeProjectSchema = z.string().trim().min(1);

/** Persists the last-selected project across restarts (PRD FR-02 "project state remains consistent across application restarts"). */
export function readActiveProjectId(storage: ActiveProjectStorage = window.localStorage): string | null {
  try {
    const raw = storage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = activeProjectSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeActiveProjectId(
  projectId: string | null,
  storage: ActiveProjectStorage = window.localStorage,
): void {
  try {
    if (projectId === null) storage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
    else storage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);
  } catch {}
}
