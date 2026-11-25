import type { OpenBotMigration } from "./migration";

// Project and repository management core (OpenBot Dev Workspace Phase 1, FR-01/FR-02/FR-03).
//
// These are plain config-style projections, written and read directly through `OpenBotDatabase`
// without an `orchestration_events` entry per write: the same shape already used for
// `projection_mcp_servers` (see `mcp-server-store.ts`). There is no replay concern here (unlike
// threads/messages), so an event log would add ceremony without a reader.
//
// `projection_workspaces`: a workspace groups projects. For MVP a single default workspace is
// created automatically (`ProjectStore.ensureDefaultWorkspace`); multi-workspace UI is a later
// phase.
//
// `projection_projects`: belongs to a workspace. `pinned` and `sort_order` back FR-02's "pin
// favorite projects" / "reorder projects".
//
// `projection_repositories`: a registered Git working tree, Method A (local import) only for
// Phase 1 — no clone/remote-host repositories yet, so `host_id` is always `'local'` for now, but
// the column exists per the PRD's execution-host data model so Phase 7 is additive, not a rename.
// `(host_id, canonical_path)` is unique: re-importing the same folder on the same host is a
// conflict the service layer surfaces (FR-03 "Detect duplicate registrations on the same host").
//
// `project_repositories`: a many-to-many join, since the PRD's data model allows a repository to
// belong to more than one project (9.2 "Use a join entity if repositories can be associated with
// multiple projects").
const PROJECTS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS projection_workspaces (
    workspace_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS projection_projects (
    project_id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES projection_workspaces(workspace_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icon TEXT,
    color TEXT,
    pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );
  CREATE INDEX IF NOT EXISTS projects_workspace ON projection_projects(workspace_id, sort_order);

  CREATE TABLE IF NOT EXISTS projection_repositories (
    repository_id TEXT PRIMARY KEY,
    host_id TEXT NOT NULL,
    name TEXT NOT NULL,
    canonical_path TEXT NOT NULL,
    remote_url TEXT,
    current_branch TEXT,
    default_branch TEXT,
    dirty INTEGER CHECK(dirty IN (0, 1) OR dirty IS NULL),
    health TEXT NOT NULL DEFAULT 'available'
      CHECK(health IN ('available', 'missing', 'dirty', 'detached-head', 'invalid')),
    last_refreshed_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS repositories_host_path ON projection_repositories(host_id, canonical_path);

  CREATE TABLE IF NOT EXISTS project_repositories (
    project_id TEXT NOT NULL REFERENCES projection_projects(project_id) ON DELETE CASCADE,
    repository_id TEXT NOT NULL REFERENCES projection_repositories(repository_id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    PRIMARY KEY (project_id, repository_id)
  );
  CREATE INDEX IF NOT EXISTS project_repositories_repository ON project_repositories(repository_id);
`;

/** The four tables right after migration 70, for the migration tests of earlier versions. */
export const PROJECTS_TABLES_AFTER_MIGRATION: Record<string, never[]> = {
  projection_workspaces: [],
  projection_projects: [],
  projection_repositories: [],
  project_repositories: [],
};

export const migration: OpenBotMigration = {
  version: 70,
  name: "projects",
  // Only creates tables, so no foreign-key pause and no vacuum: identical reasoning to v38.
  up: (db) => db.exec(PROJECTS_SCHEMA_SQL),
};
