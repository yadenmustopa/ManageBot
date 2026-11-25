# Current Architecture (as verified)

Conceptual layering of the desktop app, grounded in files actually read during this audit (not the
PRD's placeholder layer list — this one names real modules).

```
┌─────────────────────────────────────────────────────────────┐
│ src/renderer/src  (SolidJS)                                 │
│  features/<domain>/  — context + scope + components + port  │
│  Enforced: cannot import src/main, src/backend, src/preload │
│  directly (biome path rule, fails `bun run lint`)            │
└───────────────────────────┬───────────────────────────────────┘
                             │ window.openbot.<domain>.<method>()
┌───────────────────────────▼───────────────────────────────────┐
│ src/preload  (contextBridge)                                 │
│  index.ts (64 KB) exposes the whole window.openbot surface    │
│  *-decoding.ts — typed, tested validators for every payload   │
│  crossing the boundary in both directions                     │
└───────────────────────────┬───────────────────────────────────┘
                             │ ipcRenderer.invoke / .on
┌───────────────────────────▼───────────────────────────────────┐
│ src/main/ipc  (88 handler files, one per domain)              │
│  agent-handlers.ts (73 KB), app-handlers.ts, account-handlers,│
│  acp-registry-handlers.ts, agent-dock-handlers.ts, ...         │
└───────────────────────────┬───────────────────────────────────┘
                             │ direct function calls
┌───────────────────────────▼───────────────────────────────────┐
│ src/backend  (pure-ish business logic, imported by main only) │
│  agent/        ~170 files: conversation-runtime, provider     │
│                adapters, tool router, memory, workflows,      │
│                channels, routines                              │
│  database/     query/writer modules over node:sqlite          │
│  migrations/   69 numbered files + registry + frozen baseline │
│  workflows/, agent-tasks/, agent-threads/, agent-waits/,      │
│  agent-data/, browser-profiles/, crm/, messaging/,            │
│  routine-flows/, routine-results/                              │
└───────────────────────────┬───────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────┐
│ node:sqlite (DatabaseSync), one local file per install         │
│  Event-sourced: orchestration_events (append-only) +           │
│  orchestration_command_receipts + projection_* read models      │
└─────────────────────────────────────────────────────────────┘

Parallel, loosely-coupled satellites (same monorepo, different deploy targets):
┌─────────────────────┐   ┌──────────────────────┐   ┌───────────────────┐
│ apps/auth-api         │  │ remote/ (Signal)       │  │ apps/mobile        │
│ Cloudflare Workers,   │  │ WebRTC relay + coturn, │  │ React Native,      │
│ accounts/billing/     │  │ stateless, ES256       │  │ separate OTA path  │
│ hosted-server auth    │  │ ticket-authenticated   │  │                    │
└─────────────────────┘   └──────────────────────┘   └───────────────────┘
```

## Key architectural facts that constrain Phase 1 design

1. **The renderer/backend boundary is enforced by tooling, not convention.** Any new Project/
   Repository feature must add its own `*-decoding.ts` (preload), `*-handlers.ts` (main/ipc), and
   `*-port.ts` (renderer) — skipping this and reaching into `src/backend` from the renderer
   directly will fail CI (`bun run lint` / `check:ui`), not just "be bad practice."
2. **The database is event-sourced**, not plain CRUD (see `DATABASE_AUDIT.md`). New entities should
   emit `orchestration_events` rows and maintain `projection_*` tables, matching 69 prior
   migrations' convention, rather than introducing a second, inconsistent persistence style.
3. **Agent execution is per-agent-folder, not per-task.** `AGENT_RUNTIME_AUDIT.md` traces the exact
   four call sites where `cwd: agent.workspacePath` is set; this is the single seam FR-04 extends.
4. **A large, independent E2E-script test culture already exists** (hundreds of `*-e2e.ts` /
   `*-smoke.ts` scripts) alongside `vitest` unit/integration tests. New Phase 1+ features should add
   to both patterns where applicable (a `*-e2e.ts` for anything needing a real Electron/provider
   session, `vitest` for pure logic), matching existing naming (`kebab-case-e2e.ts`).
5. **Workflows, Channels, Skills, Memory, and conversation-level Tasks are mature, separate
   subsystems already.** None of them currently carries a project/repository scope column. Phase 1
   is additive-association work on all of them (FR-06/07/08), not new subsystem design.
6. **Monorepo, not single-app.** `apps/*` and `remote/` are separate deploy targets (Cloudflare
   Workers, Docker Compose) that the PRD does not ask us to touch — the desktop app (`src/`) is the
   entire scope of this PRD. Changes should stay inside `src/` + new `docs/`.

## Build/release surface (for completeness, not in PRD scope to change yet)

`electron-vite` (dev/build) → `electron-builder` (package/dist), publishing to
`{ provider: github, owner: nightly-labs, repo: openbot }` per `electron-builder.yml` — flagged in
`LICENSE_AUDIT.md`/`RISK_REGISTER.md` as needing rebranding before any real packaging, well outside
Phase 0/1 scope.
