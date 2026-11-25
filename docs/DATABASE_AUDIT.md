# Database Audit

## Engine

SQLite via Node's **built-in `node:sqlite`** module (`DatabaseSync`), confirmed from
`src/backend/database/database-core.ts:2` (`import type { DatabaseSync } from "node:sqlite"`). No
ORM, no `better-sqlite3`, no `drizzle`/`prisma`. Local file, per-install (one DB per desktop
install, not shared/server-side) — consistent with the PRD's "local-first" principle (3.2).

## Architecture: event-sourced, not plain CRUD

This is the single most important structural finding for Phase 1 design. The schema is **CQRS /
event-sourced**:

- `orchestration_events` — append-only event log. Every row: `event_id`, `command_id`,
  `aggregate_type`, `aggregate_id`, `event_type`, `occurred_at`, `payload_json`
  (`CHECK(json_valid(...))`), indexed by `(aggregate_type, aggregate_id, sequence)`.
- `orchestration_command_receipts` — idempotency/result record per inbound command
  (`command_id` PK, `first_sequence`/`last_sequence`, `result_json`).
- `projection_*` tables — read-optimized, rebuildable projections of that event stream (e.g.
  `projection_agents`, `projection_threads`, `projection_provider_sessions`). Each carries
  `last_event_sequence` so a projection knows how far it has caught up.

**This is why `grep`-ing for "project" earlier surfaced only `projection_*` names** — it's
event-sourcing terminology, unrelated to the PRD's "Project" (workspace/repo-organizing) concept.
No naming collision in practice, but worth choosing a clearly distinct vocabulary (e.g. "Project"
stays as-is, but internal code/table names should probably avoid anything that reads as
"projection_project*" at a glance) when writing the actual migration.

**Implication for Phase 1**: new entities (Workspace, Project, Repository, Worktree, Development
Task) should follow the same pattern — commands → `orchestration_events` rows → new
`projection_workspaces` / `projection_projects` / `projection_repositories` / etc. tables — rather
than being added as ad-hoc mutable tables. This is more work up front than a plain CRUD table, but
it's what "additive, minimal-upstream-modification, reuse existing implementations" (PRD 0.1)
concretely means here: the migration mechanism, the event log, and the command/receipt pattern all
already exist and are exercised by 69 migrations' worth of prior art.

## Migration mechanism

`src/backend/migrations/0001..0069-*.ts` (69 files) + `registry.ts` (imports and orders all of
them) + `migration.ts` (the `OpenBotMigration` interface: `version`, `name`, optional
`disableForeignKeys`/`vacuumAfterCommit`, and an `up(db, appliedAt)` function run inside one
transaction against `DatabaseSync`). `0008-baseline.ts` is explicitly frozen ("the frozen
compatibility schema for every database that predates v8... future schema changes must update
LATEST_SCHEMA_SQL and append a migration without editing this SQL") — i.e. **never edit old
migration files**; a new feature is always a new numbered file (next would be `0070-*.ts`). There
is also a `check:migrations` script (`bun scripts/check-frozen-migrations.ts`) that almost
certainly enforces this at CI — a new Project/Repository table must go through this, not a hand
edit.

## Tables most relevant to this PRD (from `0008-baseline.ts` + later migrations, by name)

- `projection_agents` — one row per agent; `agent_json` holds most agent config as JSON (so
  `workspacePath`, per `AGENT_RUNTIME_AUDIT.md`, is very likely inside this JSON blob, not a typed
  column — **not fully confirmed in this pass**, flagged as a precise follow-up before writing the
  Phase 1 migration that needs to read/join against it).
- `projection_threads` — one row per conversation thread, `agent_id` FK-like reference.
- `projection_provider_sessions` (`0008-baseline.ts`) — **already has exactly the shape PRD FR-05
  wants**: `provider TEXT CHECK(provider IN ('codex','claude','grok'))`, `external_session_id`,
  `resume_cursor`, `state`. Later migrations extend the provider `CHECK` list (`0017-opencode`,
  `0022-antigravity`, `0023-custom-agents`, `0024-cursor`, `0026-cline`, `0028-no-check` — the last
  one presumably relaxes the `CHECK` constraint to stop hardcoding the provider list). **Reuse this
  table directly for `CodingSessionService`'s provider-session-reference need** instead of adding a
  new one — it is the PRD's "Provider session persistence" requirement, already built.
- `projection_agent_tasks` (`0038-agent-tasks.ts`) — backs the existing conversation-level "Task"
  feature (`src/renderer/src/features/tasks/*`, see `UPSTREAM_AUDIT.md`). Confirmed not the same
  shape as PRD FR-10's engineering-task tracker (no priority/acceptance-criteria/Kanban columns
  expected here — not individually verified column-by-column in this pass).
- `projection_channels`, `projection_channel_tasks`, etc. (`0018-channels.ts`) — existing Channels
  feature, reusable per FR-07.
- `projection_mcp_servers` (`0020-mcp-servers.ts`), `projection_workflows`
  (`0046-workflows.ts`, inferred from script naming) — existing Skills/MCP/Workflows scopes, to be
  extended with scope associations per FR-06/FR-08, not replaced.

## What Phase 1 needs to add (schema-level, conceptual — verify exact SQL at implementation time)

Per PRD section 9, but reshaped to the event-sourced pattern above:
- `projection_workspaces`, `projection_projects`, `projection_repositories` — new aggregates, own
  event types.
- A join/association table (`projection_project_repositories` or similar) if repositories can
  belong to multiple projects — PRD 9.2 flags this as an open question; resolve it before writing
  the migration, since event-sourced join tables are harder to change after the fact than a plain
  CRUD join row.
- Extend `projection_agents` (or wherever `workspacePath`/agent config actually lives — see
  verification note above) with optional `scope_type`/`scope_id`/`project_id`/`repository_id`
  columns — **nullable/additive**, per PRD 9.4 ("unscoped entities remain global... do not
  automatically assign existing sessions to projects based on guesses").
- New `projection_worktrees` and `projection_development_tasks` tables (FR-09/FR-10) — genuinely
  new, no existing equivalent (confirmed in `UPSTREAM_AUDIT.md`).

## Migration testing

`src/backend/openbot-database.test.ts` (large — seeds legacy rows, including a
`seedLegacyAgent(database, legacyId, workspacePath)` helper at line 4023) and
`src/backend/agent-workspace-root-migration.test.ts` are the existing migration-test patterns to
copy for the new Phase 1 migration's own tests (PRD section 19.5's "existing database containing
agents and conversations" scenario is already a first-class test pattern here, not something to
invent).

## Not verified in this pass

- Exact column list of `projection_agents.agent_json` (is `workspacePath` top-level JSON or
  nested?) — needed before Phase 1 writes any migration that joins on it.
- Exact schema of `projection_agent_tasks` (0038) and `projection_workflows`/`projection_channels`
  descendant tables beyond what's quoted above — read the migration files directly before
  implementing FR-06/07/08/10 associations, don't rely on this summary alone.
