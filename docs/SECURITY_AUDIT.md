# Security Audit (Phase 0)

Scoped to what this PRD's new surface area (FR-03/04/09/12) will touch — filesystem paths, Git
subprocess execution, GitHub auth, and agent permission boundaries — plus general hygiene findings
from reading the fork's own setup. Not a full upstream pentest.

## Filesystem / path handling precedent already in the codebase

`src/backend/workspace-paths.ts` is a strong existing pattern to copy for Repository import
(FR-03): `isWithin(workspaceRoot, path)` boundary checks, `realpath()`-based canonicalization
before trust decisions, explicit `allowedRoots`/`allowRoot` options rather than ambient trust, and
a dedicated `isApplicationWorkspacePath` guard (`src/backend/agent-store.ts:1827`) against a path
accidentally pointing inside the app's own installation. **Reuse these primitives for
`RepositoryService`'s path validation** rather than writing new path-safety code — PRD 11.3
("validate canonical paths", "prevent path traversal", "validate symlink boundaries") is already a
solved problem here, just for a different entity.

## Git subprocess execution (new code, FR-03/09/11)

No existing Git-automation wrapper was found (`RISK_REGISTER.md`/`FEATURE_INVENTORY.md`). This
means **there is no existing safe-subprocess convention specific to Git to copy** — but
`src/main/acp-registry-process.ts` shows the house style for spawning subprocesses generally:
`spawn(target.command, target.args, { cwd, env, stdio, windowsHide: true, ... })` — **argument
arrays, never a shell string** (`cliSpawnTarget` builds `{command, args}` rather than a
concatenated command line). Any new Git wrapper (`GitService`) must follow this same
argument-array style — never `exec("git ...")` with interpolated input — per PRD 11.3 ("use
argument-safe subprocess execution", "do not interpolate untrusted user input into shell
commands").

## Prompt-injection / untrusted-content boundary (FR-08, PRD 11.5)

The agent runtime already treats repository/instruction content as data the model reads, not
commands — this fork's own `AGENTS.md`/`CLAUDE.md` convention (which this very audit follows) is
the existing pattern for "detected instruction files" (FR-08). No special new defense mechanism is
needed for discovery/display of `AGENTS.md`/`CLAUDE.md`/`README.md` content — the existing
instruction-loading path (`developer-instructions.ts`) already treats this as prompt content for
the model, which the model (not the host app) is responsible for not blindly obeying — this is
upstream's and Anthropic's/the provider's problem, not something this fork needs to re-solve, as
long as the new Project Knowledge feature doesn't add a path where repository content can reach a
*host-privileged* action (e.g. auto-approving a Git operation) without the existing approval gates.

## Credential handling

Nothing in this audit found tokens/secrets logged in plaintext in the files read. `NOTICE` and the
PRD both call out "never store raw tokens in ordinary application logs." Not independently verified
across the whole `src/backend/agent/` logging call sites (170+ files, out of scope for Phase 0 time
budget) — flag as a targeted Phase 1 review item specifically for whatever new GitHub-auth code
FR-12 adds, since that's genuinely new attack surface this PRD introduces (vs. auditing 170
pre-existing files that aren't being touched).

## Release/branding hazard (concrete, found this pass)

`electron-builder.yml`: `appId: app.openbot.desktop`, `productName: OpenBot`,
`publish: { provider: github, owner: nightly-labs, repo: openbot }`. This is a real, specific
finding (not hypothetical): if anyone on this fork runs `bun run dist:*` or `package*` with a GitHub
token that happens to have write access to `nightly-labs/openbot` (unlikely for this fork's owner,
but worth stating precisely), electron-builder would attempt to create/attach a release there. More
realistically, the auto-updater in any packaged build of this fork would check
`nightly-labs/openbot`'s releases for updates, not this fork's own — meaning **a packaged build of
this fork would silently try to "update" to upstream's official builds**, which is both broken and
a trust-boundary problem (installing binaries this fork's maintainer didn't build). Must be changed
(`appId`, `productName`, `publish.owner`/`publish.repo`) before any packaging work, not just before
public distribution.

## Database

`node:sqlite` with `CHECK(json_valid(...))` constraints already enforced on JSON columns
(`orchestration_events.payload_json`, etc.) — a good existing discipline to continue for any new
JSON-bearing columns in Phase 1's new tables.

## Dependency supply chain

`bunfig.toml` sets `minimumReleaseAge = 259200` (3 days) for most packages — a real, existing
supply-chain-attack mitigation (blocks installing a package version published in the last 3 days,
with two explicit excludes: `@norbert_bodziony/bloub`, `effect`). Worth knowing this exists before
anyone "fixes" a confusing install failure by just bumping a dependency — it may be this guard
working as intended, not a bug.

## Not assessed in this pass

- Electron `webPreferences` hardening (`contextIsolation`, `nodeIntegration`, CSP) — not read in
  this audit; standard Electron-security checklist item, recommend a dedicated pass before any
  packaged distribution even internally.
- Full dependency vulnerability scan (`bun audit`-equivalent) — not run.
- The `remote/` Signal relay's own security model beyond what its `README.md` documents — out of
  scope (this PRD doesn't touch `remote/`).
