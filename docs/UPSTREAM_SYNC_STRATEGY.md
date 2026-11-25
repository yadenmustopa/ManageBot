# Upstream Sync Strategy

## Remotes (set up in this audit)

- `origin` → `git@github.com:yadenmustopa/ManageBot.git` (this fork, read/write)
- `upstream` → `https://github.com/nightly-labs/openbot.git` (fetch-only; push URL explicitly set
  to `DISABLED` to prevent an accidental `git push upstream` — see `RISK_REGISTER.md`)

## Base commit

`600f71c0a5f013f0898d95df6690802b1c711825` — record this in every Phase 1+ PR description until a
sync happens, so reviewers know what upstream state a change was built against.

## Branch strategy (adopting PRD 15.2, adjusted for what was actually found)

- `main` — tracks this fork's own mainline. Given `UPSTREAM_AUDIT.md`'s finding that the desktop
  app is the entire scope of this PRD, it's reasonable to keep `apps/*`/`remote/` completely
  untouched on this branch and only ever add commits under `src/` and `docs/`.
- `chore/phase-0-upstream-audit` — **this audit's own commits belong here**, not directly on
  `main`, so a sync/rebase against upstream later has a clean, isolated diff to reason about. (Left
  uncommitted per this task's own instructions — the user commits when ready.)
- `feat/phase-1-project-core` et seq. — one branch per PRD phase, matching 15.2 as written; no
  changes needed there, it was a reasonable proposal already.
- `chore/upstream-sync` — per sync, not a permanent branch; delete after merge.

## Sync cadence and process (PRD 15.4, confirmed feasible)

1. `git fetch upstream`
2. `git log HEAD..upstream/main --oneline` to see what changed.
3. Diff **specifically** the files Phase 1+ touches (`src/backend/project/`,
   `src/backend/migrations/007*`, the four `cwd: agent.workspacePath` call sites named in
   `AGENT_RUNTIME_AUDIT.md`, and any `*-decoding.ts`/`*-handlers.ts`/`*-port.ts` this fork added) for
   conflicts — these four call sites in particular are the highest-conflict-risk spot, since
   upstream actively develops the agent runtime (170+ files, clearly the most active area based on
   file count and the sheer number of provider-specific `*-e2e.ts` scripts).
4. Create `chore/upstream-sync`, merge/rebase, run `bun run check` (the full gate:
   `check:desktop` + `check:api` + `test:desktop`), run the migration tests specifically
   (`openbot-database.test.ts`, `agent-workspace-root-migration.test.ts`), then PR into `main`.
5. **Never auto-merge upstream into `main`** (PRD 15.4) — always via reviewed PR.

## Minimizing merge-conflict surface (concrete, based on what this audit found)

- Because `thread-lifecycle.ts`/`drain-scheduler.ts`/`boot-recovery.ts`/`context-compaction.ts` are
  clearly high-churn upstream files (core agent runtime), prefer a **small, well-isolated diff** at
  each of the four `cwd:` call sites — e.g. a single-line change to call
  `resolveExecutionContext(agent, task, session)` instead of inlining resolution logic at each site
  — so a 3-way merge against upstream changes to the surrounding code stays simple.
- New domain code (`backend/project/`, `renderer/src/features/projects/`) is zero-conflict-risk by
  construction (new files/dirs).
- New migrations are append-only by the project's own convention (`check:frozen-migrations`) — zero
  conflict risk as long as this fork keeps incrementing from whatever `0070+` is current at merge
  time, not a number picked once and forgotten.

## Release channel separation (ties to SECURITY_AUDIT.md finding)

Before any packaging, `electron-builder.yml`'s `appId`, `productName`, and `publish.owner`/
`publish.repo` must point at this fork's own identity, never `nightly-labs/openbot` — otherwise
sync strategy and release strategy actively conflict (pulling upstream's agent-runtime changes is
good; silently adopting upstream's *update channel* in a built artifact is not).
