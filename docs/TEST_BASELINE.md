# Test Baseline

Recorded as-is, per PRD section 0.1 ("never silently ignore failing tests", "record pre-existing
failures" as baseline — not fixed here).

## Environment

- Date: 2026-11-25
- Commit: `600f71c0a5f013f0898d95df6690802b1c711825` (upstream `main`, audited as the fork base)
- Node: v22.23.1 (repo `engines.node` wants `>=24.0.0` — **mismatch, not corrected for this run**)
- Bun: 1.4.2 (matches `packageManager` pin exactly)
- `bun install`: succeeded, 1535 packages, 359.68s cold.
- Electron binary (`node_modules/electron/dist`): downloaded successfully on a manual re-run of
  `bun scripts/install-electron.ts` (first `bun install` postinstall pass produced no visible log
  output for that step in this sandbox, but did not error; re-running it directly confirmed success
  with a cached zip at `/mnt/nvme/cache/electron/...`). Not fully explained — flag for whoever runs
  install next: if the app won't launch, re-run `bun scripts/install-electron.ts` by hand and check
  `node_modules/electron/dist` exists.

## Build

```
bun run build
```
→ `electron-vite build`. **Succeeded.** Output: `out/main`, `out/preload`, `out/renderer`
(hundreds of chunked renderer assets, largest `index-iPN77qYc.js` at 2.79 MB). Three
`INEFFECTIVE_DYNAMIC_IMPORT` warnings (pre-existing, cosmetic — a module is both statically and
dynamically imported, e.g. `ServerOnboarding.tsx`, `TasksView.tsx`, `SchedulePanel.tsx`). No errors.
Finished in ~5s (Vite's own reported build time; total wall time including all chunk writes was
longer).

## Unit/integration tests

```
bun run test:desktop   # = vitest run
```

```
 Test Files  1 failed | 102 passed (103)
      Tests  1 failed | 2282 passed (2283)
   Start at  11:53:04
   Duration  54.13s (transform 75.18s, setup 16.08s, import 201.16s, tests 223.50s, environment 2.16s)

error: script "test:desktop" exited with code 1
```

**2282/2283 tests pass.** This is the regression baseline — any Phase 1+ PR must not drop below
this, and any *new* failure introduced by this fork's own changes must be distinguished from this
one pre-existing failure.

### The one pre-existing failure

`src/backend/agent-data/agent-database-version.test.ts:118` —

```
AssertionError: expected false to deeply equal [ { name: 'notes', ownerAgentId: 'agent-a', rowCount: 2 } ]
```

Asserts that, after writing to a per-agent SQLite table via the `AgentTables` effect-ts service,
listing tables for that agent returns the written table with the expected row count; it instead
got `false`. Likely cause (not confirmed, not fixed): this exercises `node:sqlite` (`DatabaseSync`)
behavior that may differ between Node 22 and the Node ≥24 this repo is pinned to — worth re-running
on an actual Node 24 host before concluding it's a real upstream regression versus an artifact of
this sandbox's Node version mismatch noted above.

A second log line appeared during the run at `ERROR [openbot-database-schema] ... migration to
version 9 failed ... "fixture stop"` — this is **expected** test output from
`event-type-index-migration.test.ts`, which deliberately throws `"fixture stop"` mid-migration to
test rollback behavior (`assertThrows`), not a real failure. Logged at ERROR level by the app's own
logger even when caught in a test, which is worth knowing when reading CI logs later — it looks
alarming but isn't.

## Not run in this pass

- `bun run test` 's second half, `test:api` (Cloudflare Workers `apps/auth-api` test suite) — out
  of scope for the desktop-app-focused PRD; not attempted.
- `bun run typecheck` (parallel per-package `tsc --noEmit`) — time-boxed out of this Phase 0 pass.
  Recommend running before Phase 1 starts, since it will catch anything the build step's
  transpile-only path doesn't.
- `bun run lint` (biome) — not run to completion in this pass.
- Every `*-e2e.ts` / `*-smoke.ts` script (hundreds of them) — these need a running Electron
  instance, real provider accounts (Claude/Codex/Grok/etc.), or live Cloudflare access. None of
  that is available in this sandbox. PRD section 19.7 is explicit that "mock tests alone are
  insufficient to claim real provider integration has been verified" — so Phase 2's exit criteria
  (FR-04/AT-06/AT-07) will need a real machine with authenticated Claude Code and Codex CLIs to
  verify, not this audit.
