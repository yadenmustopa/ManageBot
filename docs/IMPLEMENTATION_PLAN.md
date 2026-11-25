# Implementation Plan (Phase 0 output → refined Phase 1 plan)

Per PRD 0.2: "report any requirement that conflicts with upstream architecture." This document is
that report plus the resulting concrete Phase 1 plan — it supersedes PRD section 17's Phase 1
task list where the two disagree, since this one is checked against real code.

## Conflicts/adjustments vs. the PRD's assumptions, found in Phase 0

1. **PRD 9.2's schema reads as plain CRUD; the real database is event-sourced (CQRS).**
   Every new table in Phase 1 needs an event type + projection, not a bare `CREATE TABLE` with
   `UPDATE`s. This is more upfront design work than the PRD implies but matches existing
   conventions better. See `DATABASE_AUDIT.md`.
2. **FR-10's "Development Task" is not a natural extension of the existing `projection_agent_tasks`
   table** — that table backs a conversation-thread concept (start/send/stop/reopen), not a
   status/priority/Kanban entity. Treat FR-10 as a genuinely new table that *references* a
   conversation task/session for its execution history, rather than trying to extend
   `projection_agent_tasks` in place.
3. **FR-04's "context resolution order" already has a partial precedent**
   (`boot-recovery.ts:449`'s `params.cwd` override), but the other three call sites do not — the
   PRD implies a clean new resolver bolted on; in reality it's "generalize one existing conditional
   to four call sites," a smaller and more surgical change than the PRD's phrasing suggests.
4. **FR-12 GitHub Integration may be smaller than scoped** — `github-connector-service.ts` already
   exists for *some* GitHub feature (exact scope unverified this pass). Phase 5 should start by
   reading that file fully, not by assuming zero existing GitHub code.
5. **Node engine requirement (`>=24.0.0`) is currently unenforced in practice** — `bun install`/
   `build`/`test` all ran fine on Node 22.23.1 in this sandbox. Recommend Phase 1 either (a)
   actually gets a Node 24 dev environment before writing code that might rely on Node-24-only
   `node:sqlite` behavior, or (b) explicitly documents that the engine field is aspirational today.
   Don't silently ignore it either way — it's exactly the kind of thing that causes the one
   observed test failure to be ambiguous (`TEST_BASELINE.md`).

## Refined Phase 1 task list (concrete file paths, not placeholders)

1. `src/backend/project/` — new domain dir: `project-service.ts`, `repository-service.ts` (reuse
   `workspace-paths.ts` primitives for path validation — see `SECURITY_AUDIT.md`).
2. `src/backend/migrations/0070-projects.ts` — `projection_workspaces`, `projection_projects`,
   `projection_repositories` + corresponding event types in whatever enum/union
   `orchestration_events.event_type` draws from (locate and extend, don't hardcode a parallel
   list — not yet located in this pass, first task of Phase 1).
3. `src/main/ipc/project-handlers.ts`, `repository-handlers.ts` — mirrors existing
   `*-handlers.ts` shape exactly (see any existing one, e.g. `agent-folder-handlers.ts`, as the
   template — it's the right size/shape for a new CRUD-ish domain).
4. `src/preload/project-decoding.ts` (+ `.test.ts`, matching every existing `*-decoding.ts` having a
   sibling test).
5. `src/renderer/src/features/projects/` — per the `src/renderer/AGENTS.md` convention exactly
   (`project-context.tsx`, `project-scope.ts`, `ProjectSidebar.tsx`, `project-port.ts`,
   `project.css`, `stores/`). Reuse `@openbot/ui` primitives; do not hand-build sidebar/shell
   per that AGENTS.md's explicit instruction.
6. Repository import dialog (FR-03 Method A only for MVP — skip clone/remote-host methods B/C for
   Phase 1, they're correctly P2/P3 in the PRD and add real scope).
7. Basic project dashboard (FR-13 P0-basic subset only: counts, no analytics).
8. Migration + UI tests, following `openbot-database.test.ts` and
   `agent-workspace-root-migration.test.ts` patterns exactly.

## Explicitly deferred out of Phase 1 (confirmed correctly scoped by the PRD, not re-litigated)

Worktrees (Phase 3), development tasks (Phase 4), GitHub/diff viewer (Phase 5), workflows
(Phase 6), cross-repo (Phase 7) — Phase 0 found nothing that changes this sequencing; it was
already right.

## Exit gate for Phase 1 (unchanged from PRD, restated for clarity)

Two distinct repositories registered, project switch works, data survives restart, zero regression
against the 2282/2283 `TEST_BASELINE.md` number, removing a repo association doesn't touch disk.
