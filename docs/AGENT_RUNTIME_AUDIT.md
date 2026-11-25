# Agent Runtime Audit

This is the load-bearing document for the whole PRD: FR-04 ("Repository-Aware Agent Context") only
works if we find the *real* place the working directory is set and extend it there, not bolt on a
prompt instruction. Found it.

## Today's model: one agent = one fixed workspace folder

Every agent has a single, persistent `workspacePath` column (confirmed via
`src/backend/agent-workspace-root-migration.test.ts`, which seeds a legacy row as
`workspacePath: "/Users/user/OpenBot/Bots/chief"`). `src/backend/workspace-paths.ts` resolves
user-typed paths like `~/OpenBot/Bots/<id>/...` or `OpenBot/Shared/...` relative to this. There is
**no per-task, per-session, or per-repository working directory today** — an agent always runs in
the same folder, turn after turn, task after task.

## Where it becomes the real process working directory

`src/backend/agent/thread-lifecycle.ts:648` (Codex session params) and `:1302` (equivalent path
elsewhere in the same file) both do:

```ts
const params: DynamicRecord = {
  ...config,
  model: agent.model,
  effort: agent.reasoningEffort,
  cwd: agent.workspacePath,
  runtimeWorkspaceRoots: workspaceWritableRoots(agent, this.#store.sharedRoot),
  approvalPolicy: this.approvalPolicy(agent),
  ...
};
```

This `params` object is what gets sent to the provider process as a **structured session-creation
parameter** (ACP `session/new`-style, via `@agentclientprotocol/sdk` + provider-specific adapters),
not interpolated into a prompt string. That already satisfies the PRD's "must actually start with
the appropriate working directory ... not rely exclusively on prompt instructions" requirement — it
just always resolves to `agent.workspacePath` today, with no task/session/repo override.

The same pattern (`cwd: agent.workspacePath`) recurs at:
- `src/backend/agent/drain-scheduler.ts:1074` — the scheduler that drains queued turns/tasks for an
  agent and (re)starts its provider session.
- `src/backend/agent/boot-recovery.ts:202, 449` — recovering/resuming sessions after app restart;
  `:449` additionally allows an override: `cwd: typeof params.cwd === "string" ? params.cwd : agent.workspacePath` — i.e. there is **already a code path that accepts a caller-supplied `cwd` instead of the default**, which is the natural seam to extend for per-task worktrees.
- `src/backend/agent/context-compaction.ts:529` — `{ threadId, cwd: agent.workspacePath }` when
  replaying/compacting history for a specific thread.

`runtimeWorkspaceRoots` / `workspaceWritableRoots(agent, this.#store.sharedRoot)` (also in
`thread-lifecycle.ts`) is a second, related mechanism: it defines which directories the provider's
filesystem tools are allowed to touch (the agent's own workspace plus a shared root) — this is the
actual sandbox enforcement, separate from `cwd`. Any repository-scoped execution context (FR-04)
needs to extend **both**: `cwd` (where the process starts) and the writable-roots list (what it's
allowed to touch), or a worktree-scoped session could still read/write outside its intended
repository.

## Provider identity: Codex vs Claude Code vs others

`client.provider === "codex"` branches are visible directly in `thread-lifecycle.ts` (e.g. the
`#proxyFingerprint` call above is Codex-only). Claude Code integration is a separate dependency,
`@anthropic-ai/claude-agent-sdk` (seen in the `bun install` output), rather than going through the
same generic ACP path as Codex/Grok/OpenCode/Antigravity/Cursor/etc. — the repo's own test-script
names (`test:claude-*-e2e.ts` vs `test:codex-*-e2e.ts` vs `test:acp-*-e2e.ts`) corroborate that
Claude Code has its own dedicated set of e2e scripts distinct from the shared ACP ones, implying a
**parallel, Claude-Code-specific adapter path alongside the generic ACP one**, not a single unified
code path for every provider. The exact adapter boundary (one interface both implement, or two
independently-shaped call sites) was not fully traced in this pass — recommend a short, focused
follow-up read of `src/backend/agent/conversation-runtime.ts` (43.5 KB, the largest file touching
both providers) before writing `RepositoryContextResolver` so the resolver's output shape matches
both adapters, not just Codex's.

## What FR-04 needs to add, concretely

1. A new, optional execution-context parameter threaded through the same call path that currently
   hardcodes `cwd: agent.workspacePath` — the `boot-recovery.ts:449` conditional
   (`typeof params.cwd === "string" ? params.cwd : agent.workspacePath`) shows the codebase already
   half-expects this to vary per call; the PRD's `RepositoryContextResolver` should produce the
   value that flows into that same `cwd` slot, with `agent.workspacePath` demoted to "fallback when
   no repository/task scope applies" (which is exactly PRD FR-04's resolution order).
2. The same resolved directory must also feed `workspaceWritableRoots`-equivalent fencing, or
   worktree isolation (FR-09) is cosmetic.
3. A **preflight check** before any of the four call sites above — confirm the resolved directory
   exists, is the expected Git repo/worktree, and the host is reachable — per PRD FR-04's
   "Preflight validation" list. None of that validation exists today; `agent.workspacePath` is used
   as-is with no existence/Git check visible in the four sites audited.

## Session resume

`boot-recovery.ts` is also the restart/resume path (PRD FR-05 "provider session resume"). It
already persists enough to recover `cwd` across an app restart conditionally
(`boot-recovery.ts:449`). `src/backend/database/provider-sessions.ts` (8.8 KB) is almost certainly
the storage for provider-native session references (`provider_session_ref` in the PRD's proposed
schema) — confirm its exact column shape before designing `CodingSessionService` (`DATABASE_AUDIT.md`
flags this as unverified).

## Confidence level

High confidence on the four `cwd: agent.workspacePath` call sites (grep-verified, read in context).
Medium confidence on the Codex-vs-Claude-Code adapter boundary (inferred from script names and one
file read, not a full trace of `conversation-runtime.ts`). Recommend that trace as the very first
task of Phase 2, before writing `RepositoryContextResolver`.
