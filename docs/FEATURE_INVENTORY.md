# Feature Capability Inventory

Maps each PRD functional requirement to what already exists upstream, so Phase 1+ can "reuse or
extend instead of rebuild" (PRD 0.2) with evidence, not assumption.

| PRD requirement | Upstream equivalent | Verdict |
|---|---|---|
| FR-01 Workspace Management | None | **New.** No workspace/org concept anywhere in schema or UI. |
| FR-02 Project Management | None (only `projection_*` CQRS naming, unrelated) | **New.** |
| FR-03 Repository Management | None — no git-clone/import/registration flow found anywhere in `src/backend` or `src/main` | **New.** |
| FR-04 Repository-Aware Agent Context | `cwd: agent.workspacePath` passed as a structured ACP session param in `thread-lifecycle.ts`, `drain-scheduler.ts`, `boot-recovery.ts`, `context-compaction.ts` (see `AGENT_RUNTIME_AUDIT.md`) | **Extend.** The verified-structured-param mechanism already exists; it just always resolves to one fixed per-agent folder today. This is the real integration point. |
| FR-05 Persistent Coding Sessions | `projection_threads` + `projection_provider_sessions` (has `external_session_id`, `resume_cursor`, `state`) | **Reuse directly**, extend with project/repo/worktree FKs. |
| FR-06 Project-Scoped Agent Management | `projection_agents`, full agent config/roles/models already exist | **Extend** with scope association table; do not touch agent engine itself. |
| FR-07 Project Channels | `projection_channels`, `projection_channel_tasks`, `channel-agent-tools.ts` | **Extend**, add project/repo scope. |
| FR-08 Project Knowledge/Instructions | `developer-instructions.ts` (54 KB), `agent-instructions-files.ts`, AGENTS.md/CLAUDE.md-style file detection already a pattern in this very repo (`AGENTS.md` per-directory) | **Extend.** Native instruction-file detection conventions already exist; add project/repo scoping on top. |
| FR-09 Git Worktree Manager | None. `dev-worktree.ts`/`DevWorktreeLabel.tsx` is a cosmetic dev-build indicator only (confirmed by reading the file) | **New**, genuinely. No git-automation code (`simple-git`, `isomorphic-git`, or hand-rolled clone/worktree wrapper) found anywhere. |
| FR-10 Development Task Management | `projection_agent_tasks` (0038) backs a *conversation* task (start/send/stop/close/reopen a thread) — confirmed via `tasks-port.ts` | **Partial reuse at most** — the execution vehicle (a task = a scoped conversation) can be reused, but priority/status-lifecycle/Kanban/acceptance-criteria/dependencies need a new table (`projection_development_tasks`), related to but distinct from `projection_agent_tasks`. |
| FR-11 Git Status and Diff Viewer | None found in `src/backend`/`src/main` | **New**, but low-risk (read-only, no execution-context implications). |
| FR-12 GitHub Integration | `src/main/github-connector-service.ts` exists (seen in `workingDirectory` grep hit), `migrations/0049-github-workflows.ts` | **Partial reuse** — a GitHub connector already exists for some workflow feature; audit its actual scope (issues? PRs? just webhooks?) before building FR-12, likely smaller incremental work than the PRD assumes. |
| FR-13 Project Dashboard | None (no project concept to dashboard) | **New**, but purely presentational over FR-01/02/05/06/10 data — no new backend primitives needed beyond those. |
| FR-14 Autonomous Coding Workflows | `src/backend/workflows/` + huge number of `test:workflow-*-e2e.ts` scripts — a mature workflow engine already exists (triggers, steps, approvals per the test names: `workflow-schedule`, `workflow-agent-step`, `workflow-answers`, `workflow-output-templates`) | **Extend**, do not build a second engine. This is explicitly warned against in FR-17 ("do not implement a second competing... system") and the same principle applies here. |
| FR-15 Cross-Repository Development | None | **New**, and correctly deprioritized P3 in the PRD — depends on FR-01–FR-10 existing first. |
| FR-16 Execution Host Management | `remote/` (Signal relay) + `src/main/local-servers/` + "Servers" concept visible in the mockup sidebar — some notion of host/server already exists for Team/remote-desktop | **Partial reuse** — verify whether the existing "server" concept already carries enough host identity (OS, reachability) to extend for FR-16, or if it's WebRTC-connection-specific and unrelated. Not resolved in this pass. |
| FR-17 Agent Activity and Monitoring | "Agent Dock" (`agent-dock-window.ts`, 22 KB) + "Dynamic Island" (`OpenBotDynamicIsland` renderer asset seen in build output) — both explicitly named in the PRD's own design doc as things to *preserve* | **Extend only.** Do not build a second monitoring UI — this is the PRD's own explicit instruction (FR-17) and matches what exists. |
| FR-18 File Explorer and External Editor | Not found; `agent-folders.ts` exists for agent-folder *management* (not general file browsing) | **New**, small scope per PRD (explicitly excludes full IDE/LSP). |

## Scripts/tooling already covering parts of "DevOps" for the fork itself

- `scripts/check-frozen-migrations.ts` — enforces the "never edit old migrations" rule above.
- `scripts/type-ratchet.ts` — a ratchet mechanism (only allows type-error count to go down), useful
  model for how this fork should gate its own new code quality bars.
- `scripts/review-skills.ts`, `review-agents.ts` — existing marketplace-content review tooling,
  unrelated to this PRD but notable as "don't build a second review pipeline" precedent.

## Confidence

High for FR-01/02/03/09 ("doesn't exist" — grep-verified absence). High for FR-04/05/06 (read the
actual source). Medium for FR-07/08/12/14/16/17 (inferred from file/migration names and partial
reads, not fully traced end-to-end) — treat these as "likely true, verify before committing to a
design" rather than settled fact.
