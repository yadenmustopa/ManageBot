# Proposed Architecture (Phase 1+)

Grounded in `ARCHITECTURE_CURRENT.md` — same layers, new slice added alongside existing ones, not a
parallel stack.

```
renderer/src/features/projects/        NEW — Project/Repository nav, dashboard, switcher
renderer/src/features/worktrees/        NEW — (Phase 3)
renderer/src/features/tasks/            EXTEND existing (conversation tasks stay; dev-tasks is new,
                                          separate feature dir: features/dev-tasks/, Phase 4)
renderer/src/features/<existing>/       agents, channels, workflows — add project/repo scope filter
                                          to each, same pattern as `tasks-port.ts`

preload/project-decoding.ts             NEW typed decoder, mirrors *-decoding.ts convention
main/ipc/project-handlers.ts            NEW, mirrors *-handlers.ts convention
main/ipc/repository-handlers.ts         NEW — repository.import/clone/validate/refresh
backend/project/                        NEW domain dir, same shape as backend/agent-tasks/ etc.
  project-service.ts
  repository-service.ts
  repository-context-resolver.ts        <- the FR-04 seam: produces the value that flows into
                                            thread-lifecycle.ts's `cwd: agent.workspacePath` call
                                            sites (4 locations, see AGENT_RUNTIME_AUDIT.md),
                                            replacing the hardcoded fallback with a resolution
                                            order (task worktree > session worktree > repo dir >
                                            agent.workspacePath)
backend/migrations/0070-projects.ts     NEW, additive, event-sourced (projection_workspaces,
                                          projection_projects, projection_repositories)
backend/migrations/0071-coding-sessions-scope.ts  NEW — adds nullable project_id/repository_id/
                                          worktree_id to projection_provider_sessions (reuse, don't
                                          replace, per DATABASE_AUDIT.md)
```

## The one non-negotiable integration point

Everything else in this PRD is additive and low-risk to get wrong (worst case: unused tables, dead
UI). `RepositoryContextResolver` writing into the `cwd` slot used by the four call sites in
`thread-lifecycle.ts`/`drain-scheduler.ts`/`boot-recovery.ts`/`context-compaction.ts` is the one
place a design mistake causes real harm (PRD AT-04/AT-05/AT-16: an agent silently running in the
wrong repository or a missing directory falling back to the wrong one). Concretely:

- `boot-recovery.ts:449` already has the shape: `cwd: typeof params.cwd === "string" ? params.cwd : agent.workspacePath`. The other three sites currently skip straight to `agent.workspacePath` with
  no conditional — they need the same conditional added, fed by the resolver, not four different
  ad-hoc changes.
- The resolver must be a **pure function of (task?, session, repository, agent) → { cwd, writableRoots, readOnly }**, called once per session/turn start, not re-evaluated mid-turn — this is what
  PRD 8.4 ("context immutability") requires, and it falls out naturally from putting the resolver
  call at the same point `params` is built today.
- Preflight (directory exists, is expected repo/branch, host reachable) belongs **inside** the
  resolver, so a bad resolution fails before `cwd` is ever handed to the provider process — never
  a silent fallback.

## Naming note

Avoid "Project" colliding conceptually with the existing `projection_*` event-sourcing
terminology in code comments/variable names (no actual technical collision, confirmed in
`DATABASE_AUDIT.md`, but it reads confusingly side by side — e.g. don't name a service
`ProjectProjection` without a clarifying comment).

## What this explicitly does NOT change

Per PRD 0.1 and confirmed safe by this audit: the agent engine, ACP/Claude-Code-SDK provider
adapters, the event-sourcing core, Channels/Skills/Workflows/Memory internals, Agent Dock/Dynamic
Island UI, and the `remote/` server are all extended via new scope-association tables/filters, never
rewritten.
