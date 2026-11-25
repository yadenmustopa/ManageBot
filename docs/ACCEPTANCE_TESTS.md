# Acceptance Tests (Phase 0 scope)

Phase 0 itself has no product acceptance criteria (it produces documents + a verified baseline).
This file records (a) the acceptance evidence for Phase 0's own exit criteria, and (b) carries
forward the PRD's AT-01..AT-22 matrix unchanged, since Phase 0 found no reason to alter it — with
file-level pointers added for where each will actually be exercised, once written.

## Phase 0 exit criteria — status

| Exit criterion (PRD section 17, Phase 0) | Status |
|---|---|
| Upstream application build verified or blocker documented | **Verified.** `bun run build` succeeds, see `TEST_BASELINE.md`. |
| Existing test baseline recorded | **Done.** 2282/2283 `vitest` tests pass; one pre-existing failure recorded with file:line. |
| License limitations documented | **Done.** `LICENSE_AUDIT.md` — PolyForm Noncommercial 1.0.0 confirmed, commercial-use ambiguity flagged, not resolved (needs upstream's answer, not an engineering decision). |
| Runtime working-directory integration point identified | **Done**, with high confidence — `AGENT_RUNTIME_AUDIT.md`, 4 named call sites. |
| Proposed implementation approved | **Pending** — this is a human decision; `IMPLEMENTATION_PLAN.md` is the proposal awaiting review. |
| No unrelated product functionality removed | **True** — this pass was read-only plus new `docs/` files; nothing in `src/`/`apps/`/`packages/`/`remote/` was modified. |

## PRD's AT-01..AT-22 — carried forward, annotated

(Full text in `improvement/PRD.md` section 20 — not duplicated here verbatim to avoid drift between
two copies. Annotations below are what Phase 0 adds.)

- **AT-04/AT-05/AT-16** (repository isolation, project-switch doesn't move a running execution,
  missing directory fails explicitly) — these three are the ones that exercise the exact
  `AGENT_RUNTIME_AUDIT.md` seam. Write these as real `vitest` tests against
  `RepositoryContextResolver` directly (pure function, easy to unit test) **and** as one real
  `*-e2e.ts` script that starts two agents against two disposable repos and checks the actual
  process `cwd`/marker file, per PRD 19.7 — a resolver unit test alone is not sufficient evidence
  for these three, since the PRD itself (19.7) explicitly distrusts mocks here.
- **AT-06/AT-07** (Claude Code / Codex start in the correct directory) — cannot be exercised in a
  sandbox without GUI + authenticated CLIs (confirmed this pass, see `TEST_BASELINE.md`). First
  real machine with both providers configured should run these before Phase 2 is called done.
- **AT-13/AT-20** (migration compatibility / upstream regression) — the regression baseline these
  compare against is now a concrete number: **2282/2283**, not "whatever currently passes." Any
  Phase 1+ PR's CI should fail if that number drops (excluding the one known pre-existing failure).
- **AT-02/AT-03** (repository import / invalid repository) — reuse `workspace-paths.ts`'s existing
  validation test style (`agent-workspace-root-migration.test.ts`) as the template.
- All other AT items unchanged from the PRD text; no Phase 0 finding contradicts them.

## New acceptance criterion this audit adds (not in the original PRD)

**AT-23: License posture.** Before this fork is used for anything beyond personal experimentation
by its owner, a written answer from `licenses@openbot.run` (or equivalent legal sign-off) must
exist, confirming or denying that the intended BharataCorp/multi-repo-commercial-dev use case is
covered. This gates *usage*, not any particular code change, but belongs in the acceptance matrix
because PRD section 16 makes it a hard requirement ("commercial production deployment is blocked
until appropriate rights and permissions have been confirmed").
