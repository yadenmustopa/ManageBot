# Upstream Audit

Phase 0 deliverable. Source of truth for everything downstream in `docs/`.

## Identity

- Upstream: https://github.com/nightly-labs/openbot
- Fork: https://github.com/yadenmustopa/ManageBot
- Audited commit (upstream `main` HEAD at fork time): `600f71c0a5f013f0898d95df6690802b1c711825`
  ("Use the OpenCode Go key saved in OpenBot before an older key (#16220)", 2026-11-25)
- `package.json`: name `openbot`, version `0.78.0`
- `engines.node`: `>=24.0.0` — **sandbox has Node v22.23.1**. Everything below still built and
  ran under bun's own bundled runtime, so this is a soft constraint in practice, but it is
  unverified on a real Node 24 host and should be treated as a real prerequisite, not just a lint rule.
- `packageManager`: `bun@1.4.2` (exact match installed)

## Repository shape

Not a single desktop app in isolation — a monorepo containing the desktop Electron app at the
repo root plus several satellite products:

```
<repo root>            desktop Electron app (main deliverable, what the PRD is about)
  src/main              Electron main process
  src/preload           contextBridge + typed IPC decoders
  src/renderer           SolidJS renderer
  src/backend           business logic, database, agent runtime (imported by main)
apps/
  auth-api              Cloudflare Workers API: accounts, billing, hosted servers, Signal auth
  mobile                React Native app
  mobile-updates        OTA update service for mobile
  browser-extension     Chrome extension (computer-use/browser control companion)
  site-router           Cloudflare Worker serving openbot.run marketing/docs sites
  status                status page
  slack-app / discord-app / telegram-app  messaging integration docs/config (mostly docs, no src for discord/telegram)
packages/
  brand, contracts, i18n, logging, team-client, telemetry, ui, user-errors, whatsapp
remote/
  remote-api (Signal), coturn, nginx — self-hostable WebRTC relay for "remote server" / Team feature
docs/                   upstream's own docs (if any) — this Phase 0 docs/ folder is new, added by this fork
```

**For this PRD, "the application" is the repo-root desktop app** (`src/`), not the monorepo as a
whole. `apps/auth-api` and `remote/` matter only insofar as the desktop app talks to them (hosted
servers, Team sync) — the PRD does not ask us to touch Cloudflare-side infrastructure.

## Package manager / commands

- Install: `bun install` (1535 packages, ~360s cold). `postinstall` restores/saves an Electron
  binary cache (`/mnt/nvme/cache/electron` in this sandbox) and installs git hooks.
- Build (renderer+main bundle, no packaging): `bun run build` → `electron-vite build`. **Verified
  working** — see Test Baseline.
- Dev: `bun run dev` → `bun scripts/dev-services.ts app` (starts local Auth API + Electron dev app
  together per `src/renderer/AGENTS.md`). Not exercised in this audit (headless sandbox, no GUI).
- Package/dist: `bun run package` / `dist:mac` / `dist:win` / `dist:linux` → prepares voice +
  remote-desktop-runtime + cua-driver assets, then `electron-builder`. **Not attempted** — these
  pull additional large platform-specific runtimes and are out of scope for Phase 0 (and risk
  publishing to upstream's release channel, see Fork Strategy / Risk Register).
- Typecheck: `bun run typecheck` (parallel per-package `tsc --noEmit`), `desktop:typecheck` for
  just the desktop app pieces. Not run to completion in this pass (time-boxed); flagged as a
  Phase 0 follow-up, not a blocker.
- Lint: `bun run lint` → `biome check --max-diagnostics=none .`
- Tests: `bun run test` = `test:desktop` (`vitest run`) + `test:api`. See `TEST_BASELINE.md` for
  the actual recorded run. The repo also defines **several hundred** `test:*` npm scripts that are
  live/E2E smoke scripts against real provider accounts, real Electron windows, or real cloud
  services (`*-e2e.ts`, `*-smoke.ts`) — these are not part of `vitest run` and are not runnable
  here (no GUI, no provider credentials, no Cloudflare access).

## Main vs renderer split

Standard Electron three-process model, but with an unusually large, well-factored `backend/`
layer that both the main process and (indirectly) IPC handlers depend on:

- `src/main/*` — Electron lifecycle, windows (`agent-dock-window.ts` is the "Agent Dock" from the
  PRD's design doc), OS integration, `src/main/ipc/*` (88 files: one handler module per domain,
  e.g. `agent-handlers.ts`, `account-handlers.ts`, `acp-registry-handlers.ts`).
- `src/preload/*` — `contextBridge`-exposed `window.openbot.*` API. Every payload crossing the
  boundary goes through a typed decoder module (`agent-decoding.ts`, `workflow-decoding.ts`, etc.)
  with matching `*.test.ts` files — this is a deliberately hardened IPC boundary, not raw
  `ipcRenderer.invoke` pass-through.
- `src/renderer/src/*` — SolidJS app. `src/renderer/AGENTS.md` documents a strict
  `features/<domain>/` convention (context/scope/components/port/css/stores) and a lint rule that
  **fails the build** if renderer code imports `src/main`, `src/backend`, or `src/preload`
  directly — all renderer access to the backend goes through the typed `window.openbot` port.
- `src/backend/*` — the actual business logic: SQLite database (`openbot-database.ts`, 69
  migrations), agent runtime (`src/backend/agent/*`, ~170+ files), workflows, messaging, CRM,
  memory. This is imported by `src/main`, not by the renderer.

## IPC mechanism

Not raw Electron IPC. Renderer calls `window.openbot.<domain>.<method>(...)` (defined in
`src/preload/index.ts`, 64 KB), which the preload decodes/validates (`*-decoding.ts`), sends over
`ipcRenderer.invoke`/`.on`, and `src/main/ipc/*-handlers.ts` dispatches into `src/backend`. Events
flow back the same way via a scoped event bus (`onScopedEvent`, seen in `tasks-port.ts`).

## Database

SQLite via Node's **built-in `node:sqlite`** (`DatabaseSync`), not `better-sqlite3` or an ORM.
Custom migration runner: `src/backend/migrations/0001..0069-*.ts` + `registry.ts` + `migration.ts`.
See `DATABASE_AUDIT.md` for detail. No existing "project" or "repository" table — see
`FEATURE_INVENTORY.md`.

## Agent runtime / providers

`src/backend/agent/*` is the core: conversation runtime, provider adapters, tool router
(`openbot-tool-router.ts`, 173 KB — the largest file in the backend), memory, workflows, channels.
Providers are plugged in via what the test-script names imply is an **ACP (Agent Client Protocol)**
pattern (`@agentclientprotocol/sdk` dependency, `acp-registry*.ts`, `acp-subagent-updates.ts`,
per-provider files like `codex-login.ts`, `codex-mcp-config.ts`, `cli-code-login.ts`,
`claude-*-e2e.ts` scripts) plus a dedicated `@anthropic-ai/claude-agent-sdk` dependency for Claude
Code specifically. See `AGENT_RUNTIME_AUDIT.md` for the working-directory mechanism, which is the
single most important finding for this PRD.

## Remote / server architecture

`remote/` is a self-hostable WebRTC signaling relay ("Signal") + coturn, documented in
`remote/README.md`: stateless-by-design (no DB, in-memory only), authenticated via short-lived
ES256 tickets issued by the Cloudflare-hosted `auth-api`. This is what the `custom-server` and
`signal-deploy` project skills (visible in this session's skill list) operate on. It is the "Team"
real-time sync / remote-desktop path, not a generic app server — the desktop app's own data lives
locally in SQLite, not on this relay.

## Updater / release

`electron-builder.yml`: `appId: app.openbot.desktop`, `productName: OpenBot`,
`publish: { provider: github, owner: nightly-labs, repo: openbot }`. **This must be changed before
any packaging/release work** — left as-is, `electron-builder --publish` would attempt to publish
releases against the upstream maintainer's own GitHub repo. See `UPSTREAM_SYNC_STRATEGY.md` and
`RISK_REGISTER.md`.

## Existing systems the PRD should reuse, not rebuild

| PRD wants | Already exists as |
|---|---|
| Channels | `src/backend/agent/channel-agent-tools.ts`, migrations `0018-channels.ts`, `0019-channel-settings.ts` |
| Skills | `src/backend/agent/skill-loads.ts`, `.agents/skills/`, `marketplace:*` scripts |
| Workflows | `src/backend/workflows/`, many `test:workflow-*` e2e scripts |
| Memory | `src/backend/agent/agent-memories.ts` (33 KB), `memory-review*.ts` |
| Tasks (conversation-level) | `src/backend/agent-tasks/`, `src/renderer/src/features/tasks/*`, migration `0038-agent-tasks.ts` — **note**: this is a sub-conversation ("start a task thread under an agent"), not a structured engineering-task tracker with status/priority/Kanban. The PRD's FR-10 needs a new, differently-shaped entity; see `IMPLEMENTATION_PLAN.md`. |
| Project-centric navigation | **Does not exist.** No workspace/project/repository hierarchy anywhere in the schema or UI. Confirmed via targeted search; the only "project" hits in the codebase are `projection_*` tables (CQRS/event-sourcing naming), unrelated to the PRD's "Project" concept. |
| Git worktree management | **Does not exist** as a product feature. `dev-worktree.ts` / `DevWorktreeLabel.tsx` is a *developer-experience* indicator (tints the app logo when the OpenBot dev build itself is running from a git worktree) — not agent/task worktree isolation. FR-09 is genuinely new. |

## What was NOT verified in this pass

- Full `bun run typecheck` (time-boxed out).
- `bun run dev` / actually launching the Electron app (no GUI in this sandbox).
- Packaging (`electron-builder`) — large, pulls platform runtimes, out of scope for Phase 0.
- Live/E2E provider smoke tests (`test:claude-agent-smoke`, `test:codex-agent-smoke`, etc.) — need
  real authenticated Claude Code / Codex accounts.
