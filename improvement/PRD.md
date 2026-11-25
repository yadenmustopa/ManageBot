# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# OPENBOT DEV WORKSPACE

**Version:** 1.0.0  
**Date:** 2026-11-25  
**Status:** Ready for Technical Audit  
**Document Type:** Master PRD, Technical Specification & AI Agent Handover  
**Upstream Repository:** https://github.com/nightly-labs/openbot  
**Product Name:** OpenBot Dev Workspace (working title)  
**Development Model:** Upstream-Preserving Fork  
**Primary Platform:** Linux Desktop  
**Primary AI Providers:** Claude Code and OpenAI Codex  
**Architecture Principle:** Local-first, Project-centric, Repository-aware, Multi-agent

---

# 0. MASTER INSTRUCTION FOR IMPLEMENTING AI AGENT

You are acting as a Principal Software Architect, Senior Full-Stack Engineer, AI Agent Infrastructure Engineer, DevOps Engineer, and QA Lead.

Your assignment is to transform the existing OpenBot application into a project-centric multi-agent software development workspace.

This document is the master specification and source of product requirements.

Do not immediately implement all features.

Start by auditing the actual upstream source code, verifying the license, understanding the existing architecture, running the original application, and documenting the integration points.

## 0.1 Mandatory operating principles

- Never assume the existing database schema, framework version, API routes, IPC channels, or runtime architecture.
- Verify every architectural assumption against the actual source code.
- Reuse existing implementations whenever possible.
- Do not duplicate existing OpenBot capabilities.
- Do not rewrite the complete application.
- Do not replace the existing framework without a verified technical requirement and approval.
- Minimize modifications to upstream core modules.
- Prefer additive and modular implementation.
- Preserve backward compatibility.
- Maintain the ability to synchronize with upstream.
- Work incrementally by approved milestones.
- Do not claim that a feature works unless it has been tested.
- Never silently ignore failing tests.
- Never delete unrelated functionality.
- Never expose API keys, authentication tokens, or user credentials.
- Do not bypass commercial licensing, authentication, provider restrictions, or security mechanisms.
- Never push destructive changes, force-push shared branches, or merge into main without authorization.
- Always preserve existing user data.

## 0.2 First assignment

Your initial assignment is Phase 0: Upstream Audit and Foundation.

Before implementing major features, produce:

1. Upstream architecture audit.
2. License and dependency audit.
3. Feature capability inventory.
4. Database schema analysis.
5. Agent execution lifecycle analysis.
6. Workspace and working-directory analysis.
7. UI navigation architecture analysis.
8. Security and permissions analysis.
9. Upstream compatibility strategy.
10. Proposed technical implementation plan.
11. Risk register.
12. Test baseline.

If a requirement already exists in upstream, reuse or extend it instead of rebuilding it.

Report any requirement that conflicts with upstream architecture.

---

# 1. PRODUCT OVERVIEW

## 1.1 Background

OpenBot provides an existing multi-agent AI workspace with support for AI providers, agent management, conversations, channels, skills, workflows, and server-related capabilities.

However, the intended use case requires managing software development across multiple Git repositories with strong project and repository boundaries.

The desired application must support an organization that develops several interconnected products and repositories using Claude Code, Codex, and other coding agents.

The primary problem is that an agent-centric workflow does not provide sufficiently structured management of:

- Projects.
- Git repositories.
- Repository-specific conversations.
- Coding sessions.
- Working directories.
- Development tasks.
- Git branches.
- Git worktrees.
- Pull requests.
- Project instructions.
- Repository-specific knowledge.
- Cross-repository dependencies.

The new application must introduce a project-centric organizational layer without sacrificing existing OpenBot capabilities.

## 1.2 Product vision

Create a unified software development command center where a human developer can manage multiple repositories and coordinate AI coding agents from a single desktop application.

The user must be able to:

- Open or import existing Git repositories.
- Organize repositories into projects.
- Assign Claude Code or Codex agents to repositories.
- Start development conversations with verified repository context.
- Switch between projects without losing previous sessions.
- Run multiple coding agents safely in parallel.
- Track development tasks and milestones.
- Review code changes.
- Manage branches and worktrees.
- Create and review pull requests.
- Maintain project-specific instructions and knowledge.
- Coordinate changes spanning multiple repositories.
- Monitor remote development servers.

## 1.3 Product positioning

The product is not intended to become:

- A replacement for Git.
- A replacement for Claude Code or Codex.
- A full IDE comparable to VS Code.
- A new foundational AI model.
- A proprietary AI inference service.
- A complete replacement for GitHub.
- A rewrite of the OpenBot application.

The product is intended to become:

**A project-centric orchestration and management layer for AI-assisted software engineering.**

---

# 2. PRODUCT GOALS

## 2.1 Primary goals

G-01: Provide native project management.

G-02: Provide reliable repository-level context for coding agents.

G-03: Support persistent, resumable coding sessions.

G-04: Enable safe parallel development through Git worktree isolation.

G-05: Organize channels, agents, tasks, workflows, and knowledge by project or repository.

G-06: Preserve existing OpenBot features.

G-07: Support both Claude Code and Codex through a provider-independent architecture.

G-08: Provide an intuitive desktop application for managing many repositories.

G-09: Enable cross-repository coordination.

G-10: Maintain upstream compatibility wherever practical.

## 2.2 Success metrics

Initial product targets:

- Users can import an existing repository within 30 seconds, excluding external authentication and cloning time.
- Users can start a repository-scoped coding session in no more than three primary UI actions.
- Project switching does not restart unrelated running agents.
- Repository selection persists after application restart.
- No unintended repository context leakage between unrelated coding sessions.
- Every coding task has traceable repository, agent, session, and execution context.
- Parallel write-enabled tasks use isolated working trees by default.
- Existing upstream core functionality passes the established regression baseline.
- Failed agent tasks can be inspected, resumed, or retried without losing recorded task history.

These are acceptance targets, not claims about current performance.

---

# 3. PRODUCT DESIGN PRINCIPLES

## 3.1 Project-first architecture

The application must prioritize projects and repositories rather than treating every agent as an unrelated global entity.

## 3.2 Local-first

Local development must work without requiring an additional proprietary cloud backend introduced by this fork.

External AI providers may still require internet access and authentication.

## 3.3 Provider-independent

Project management must not depend on Claude Code-specific or Codex-specific implementation details.

Provider-specific functionality must be handled through adapters or existing upstream integration boundaries.

## 3.4 Human-in-the-loop

Humans retain control over:

- Production deployments.
- Merging pull requests.
- Destructive Git actions.
- Expanding agent permissions.
- Publishing releases.
- Accessing sensitive infrastructure.

## 3.5 Upstream-preserving

Implement project features as extensions to the existing OpenBot system.

Avoid unnecessary architectural changes that create excessive future merge conflicts.

---

# 4. INFORMATION ARCHITECTURE

## 4.1 Organizational hierarchy

The logical hierarchy is:

- Application
  - Workspace
    - Project
      - Repository
        - Coding Sessions
        - Agents
        - Channels
        - Tasks
        - Branches
        - Worktrees
        - Knowledge
        - Skills
        - Workflows
        - Pull Requests

Global agents, global workflows, global settings, and global channels must remain supported.

## 4.2 Workspace

A workspace represents an organization, team, or personal development environment.

Example:

Workspace: BharataCorp

Contains:

- Mabar Ecosystem.
- OpenShorts.
- Digital Invitation.
- Infrastructure.
- Experimental Projects.

## 4.3 Project

A project represents a product or development initiative.

A project may contain one or multiple repositories.

Example:

Project: Mabar Ecosystem

Repositories:

- Mabar Desktop.
- Mabar Backend.
- Mabar Web.
- Flow Automation.

## 4.4 Repository

A repository represents a Git repository registered in the application.

A repository must have a known execution host and canonical working directory.

## 4.5 Task

A task represents a unit of engineering work.

Examples:

- Implement a feature.
- Fix a bug.
- Refactor a module.
- Review a pull request.
- Investigate a production issue.
- Update documentation.
- Run regression tests.

A task may belong to a project generally or one specific repository.

Multi-repository tasks must be decomposable into repository-specific subtasks.

## 4.6 Coding session

A coding session represents a persistent interaction between the user or coordinating agent and a coding agent.

A session records:

- Project.
- Repository.
- Provider.
- Model.
- Agent.
- Working directory.
- Worktree.
- Conversation.
- Execution history.
- Related task.
- Provider-native resume information, when available.

A repository can have multiple concurrent and historical sessions.

---

# 5. USER PERSONAS

## 5.1 Solo developer

Manages multiple repositories and uses AI agents to implement features.

Needs fast repository switching, persistent sessions, and simple Git operations.

## 5.2 AI-first development manager

Coordinates multiple AI agents with specialized responsibilities.

Needs delegation, task tracking, agent monitoring, and human approval workflows.

## 5.3 Multi-repository product owner

Maintains products consisting of frontend, backend, desktop, automation, and infrastructure repositories.

Needs project-level overview and dependency coordination.

## 5.4 Remote development operator

Runs agents on a dedicated Linux computer or remote server.

Needs remote workspace management, execution status, and safe access controls.

---

# 6. FUNCTIONAL REQUIREMENTS

## FR-01: Workspace Management

Priority: P1

Provide the ability to:

- Create workspace.
- Rename workspace.
- Select workspace.
- Archive workspace.
- Restore archived workspace.
- View all projects belonging to a workspace.
- Configure workspace-level defaults.
- Associate a workspace with supported execution hosts.

Acceptance criteria:

- Workspace selection persists after restart.
- Archived workspaces are hidden from active navigation by default.
- Archiving does not remove repository files or Git history.
- Existing global OpenBot features remain accessible.

For MVP, a default workspace may be created automatically to minimize complexity.

---

## FR-02: Project Management

Priority: P0

Provide native project management.

Required functionality:

- Create project.
- Edit project name.
- Set project description.
- Set project icon or color.
- Add repository.
- Remove repository association.
- Archive project.
- Restore project.
- Search projects.
- Pin favorite projects.
- Reorder projects.
- Open project dashboard.
- Switch active project.

Each project must expose:

- Overview.
- Repositories.
- Agents.
- Channels.
- Coding sessions.
- Tasks.
- Knowledge.
- Workflows.
- Settings.

Acceptance criteria:

- Projects persist in the existing durable storage layer or compatible extension storage.
- Switching projects displays the correct scoped entities.
- Project switching does not terminate unrelated running sessions.
- Removing a project association does not delete repository files.
- Project state remains consistent across application restarts.
- Existing global entities remain usable.

---

## FR-03: Repository Management

Priority: P0

Provide multiple repository registration methods.

### Method A: Import existing local repository

The user selects an existing folder.

The system must:

1. Resolve the selected directory on the appropriate execution host.
2. Validate the directory exists.
3. Determine whether the folder is a valid Git working tree.
4. Resolve its canonical repository root.
5. Inspect Git remote configuration.
6. Detect current branch or detached HEAD.
7. Detect default branch when reliably available.
8. Inspect working-tree status.
9. Register the repository.
10. Associate it with the selected project.

### Method B: Clone repository

The user provides:

- Repository URL.
- Destination folder.
- Optional branch.
- Execution host.

Use existing Git credentials or supported authentication mechanisms.

Do not expose secrets in logs.

### Method C: Connect remote repository

Allow association with repositories already located on a supported remote OpenBot server.

Do not assume local paths are valid on remote hosts.

### Repository metadata

Display:

- Repository name.
- Canonical working directory.
- Execution host.
- Remote URL.
- Current branch.
- Default branch, if known.
- Dirty status.
- Last refresh time.
- Active worktrees.
- Active agents.
- Related development tasks.

### Additional rules

- Support repositories without a remote.
- Support normal Git worktrees.
- Support repositories with spaces in paths.
- Detect duplicate registrations on the same host.
- Do not assume branch names are always main or master.
- Do not automatically discard uncommitted changes.
- Do not automatically delete repository directories.
- Initially support non-Git folders only if the distinction is explicit and upstream capabilities allow it.

Acceptance criteria:

- Importing a valid repository works.
- Importing a non-Git folder returns a useful validation response.
- Importing a nested folder resolves the correct repository root.
- Duplicate registration is handled safely.
- Repository metadata is available after restart.
- The repository path is never silently changed by an agent.
- Remote-host paths remain associated with their correct host.

---

## FR-04: Repository-Aware Agent Context

Priority: P0

This is one of the most important requirements.

When launching a repository-scoped coding agent, the execution runtime must receive an explicitly verified working directory.

Do not rely exclusively on prompt instructions such as “please work in this folder.”

The runtime process must actually start with the appropriate working directory or use an equivalent verified provider-supported mechanism.

### Context resolution order

1. Task-specific worktree.
2. Session-specific worktree.
3. Explicit repository working directory.
4. Existing global agent workspace when no repository scope exists.

### Required context fields

- Workspace ID.
- Project ID.
- Repository ID.
- Task ID, if applicable.
- Session ID.
- Agent ID.
- Provider.
- Execution host ID.
- Working directory.
- Worktree ID, if applicable.
- Git branch.
- Effective permissions.
- Applicable project instructions.

### Preflight validation

Before executing a coding task:

- Confirm the execution host is available.
- Confirm the working directory exists.
- Resolve the canonical path.
- Validate repository association.
- Run a non-destructive Git status check.
- Verify expected worktree and branch.
- Validate effective permissions.
- Reject invalid or unavailable execution contexts.

### Context visibility

The user must always be able to inspect:

- Active project.
- Active repository.
- Working directory.
- Current branch.
- Active worktree.
- Selected model.
- Selected provider.
- Agent execution state.

Acceptance criteria:

- Launching an agent in Repository A never accidentally uses Repository B as its working directory.
- Starting another session does not silently change the first session's repository.
- A missing repository produces a visible error rather than falling back to an unrelated directory.
- Session context is preserved during restart.
- Provider-native repository discovery and instruction loading operate correctly where supported.

---

## FR-05: Persistent Coding Sessions

Priority: P0

Introduce repository-scoped coding sessions.

Required features:

- Start new coding session.
- Name session.
- Rename session.
- Reopen previous session.
- Resume provider-native conversation when supported.
- View session execution history.
- Archive session.
- Search repository sessions.
- Pin important sessions.
- Associate session with task.
- View session working directory.
- View session branch and worktree.
- Monitor running sessions.

Example:

Repository: Mabar Desktop

Sessions:

- Implement timeline editor — Codex.
- Review Electron security — Claude Code.
- Fix rendering regression — Codex.
- Prepare release notes — Claude Code.

### Session lifecycle

Proposed normalized states:

- Created.
- Starting.
- Running.
- Waiting for input.
- Waiting for approval.
- Completed.
- Failed.
- Cancelled.
- Interrupted.
- Archived.

Use existing upstream states where appropriate and map them into the product UI instead of unnecessarily replacing them.

### Provider session persistence

Persist provider session references when supported.

For example:

- Claude Code session reference.
- Codex session reference.
- Provider-specific runtime metadata.

Provider-specific resume implementation must be verified against the installed provider version and upstream integration.

Never pretend that restarting a new conversation is equivalent to resuming the previous native provider session.

Acceptance criteria:

- Sessions remain associated with their original repository.
- Reopening a session restores the correct UI context.
- Project navigation does not reset session history.
- Interrupted sessions are represented honestly.
- Multiple sessions can run concurrently when execution resources permit.
- A session cannot silently move between repositories.

---

## FR-06: Project-Scoped Agent Management

Priority: P0

Reuse the existing agent engine.

Add organizational associations and scope.

### Agent scopes

- Global.
- Workspace.
- Project.
- Repository.

### Agent roles

Provide optional reusable role templates:

1. Tech Lead.
2. Software Developer.
3. Backend Engineer.
4. Frontend Engineer.
5. QA Engineer.
6. Code Reviewer.
7. Security Reviewer.
8. DevOps Engineer.
9. Documentation Writer.
10. Researcher.

Role templates must be configurable.

Do not hardcode a specific AI provider to a role.

### Agent configuration

- Name.
- Description.
- Role.
- Provider.
- Model.
- Reasoning configuration when supported.
- Instructions.
- Skills.
- MCP configuration.
- Assigned scope.
- Default repository.
- Allowed tools.
- Permission profile.
- Maximum concurrency.
- Execution host.

### Agent association

Prefer non-destructive entity associations over cloning every agent record.

A reusable agent may be associated with several projects.

Each running execution must nevertheless have its own immutable repository context and appropriate isolation.

Acceptance criteria:

- Existing agents remain functional.
- Agents can be associated with projects.
- Project agents are visible in the project dashboard.
- Global agents remain available.
- Reusing an agent across repositories does not automatically share sensitive project context.
- Concurrent executions have separately tracked execution context.

---

## FR-07: Project Channels

Priority: P1

Extend existing channels instead of implementing an unrelated chat engine.

### Channel scopes

- Global channel.
- Workspace channel.
- Project channel.
- Repository channel.
- Task channel, if justified by the existing architecture.

### Default project channels

Optional templates:

- General.
- Development.
- Planning.
- Code Review.
- QA and Testing.
- Release Management.

### Required behavior

- Associate existing channels with projects.
- Create project-specific channels.
- Assign agents to channels.
- Select project or repository context for coding requests.
- Retain existing Channel Lead functionality where available.
- Maintain scoped conversation history.
- Allow cross-repository discussions at project level.

### Important rule

Project-level discussion does not automatically grant write access to all repositories.

A specific execution repository must be selected before a coding task modifies source files.

Acceptance criteria:

- Existing channels remain accessible.
- Project channels are filtered correctly.
- Repository-scoped channels launch coding sessions in the correct context.
- Cross-repository conversations do not accidentally change multiple repositories.
- Agent delegation preserves intended execution scope.

---

## FR-08: Project Knowledge and Instructions

Priority: P1

Provide a structured way to manage development knowledge.

### Supported knowledge sources

- AGENTS.md.
- CLAUDE.md.
- README.md.
- CONTRIBUTING.md.
- Architecture documentation.
- PRD documents.
- Development rules.
- Project-specific skills.
- Repository documentation.
- Existing OpenBot memory.
- Existing provider-supported configuration.

### Knowledge scopes

- Global.
- Workspace.
- Project.
- Repository.
- Task or session.

### Proposed precedence for user-configurable development context

- Global development defaults.
- Workspace defaults.
- Project instructions.
- Repository instructions.
- Task-specific instructions.

This is a logical composition model. Actual precedence must preserve the native instruction hierarchy of each provider and all system-level security policies.

### Required functionality

- Display detected instruction files.
- Inspect applicable project instructions.
- Associate additional documentation.
- Refresh knowledge when tracked files change.
- Display provenance of injected context.
- Allow manual project knowledge entries.
- Maintain project-specific memory.
- Prevent unintended retrieval from unrelated project knowledge.

### Security considerations

Repository documents are untrusted inputs.

Repository files must not be allowed to:

- Override application security boundaries.
- Expand filesystem permissions.
- Reveal unrelated secrets.
- Disable human approval requirements.
- Authorize destructive actions automatically.

Acceptance criteria:

- Repository-specific instructions are discoverable.
- Applicable context is visible to the user.
- Claude Code and Codex retain native instruction-loading behavior.
- The system avoids injecting duplicate instructions unnecessarily.
- Unrelated project knowledge is excluded unless explicitly authorized.

---

## FR-09: Git Worktree Manager

Priority: P1

Enable safe parallel development.

### Core requirement

Parallel write-enabled agent tasks targeting the same repository should use separate Git worktrees by default.

Example:

Main repository:

/development/mabar-desktop

Managed worktrees:

/development/.openbot-worktrees/mabar-desktop/feature-timeline

/development/.openbot-worktrees/mabar-desktop/fix-rendering

/development/.openbot-worktrees/mabar-desktop/review-caption

These paths are illustrative. The actual managed directory structure must be configurable and validated.

### Required functionality

- List repository worktrees.
- Create managed worktree.
- Associate worktree with task.
- Associate worktree with coding session.
- Create branch.
- Select base branch or commit.
- Open existing worktree.
- Display working-tree status.
- Display branch status.
- Detect stale worktree records.
- Archive completed worktree metadata.
- Remove worktree after explicit confirmation.
- Detect worktrees created outside the application.

### Branch naming

Suggested naming:

- feat/issue-123-timeline-editor
- fix/issue-124-rendering
- chore/issue-125-dependencies
- docs/issue-126-architecture

Naming conventions must be configurable.

### Safety rules

- Never remove dirty worktrees automatically.
- Never delete branches containing unmerged work without explicit authorization.
- Never automatically reset the user's primary working tree.
- Never use force removal by default.
- Validate task identifiers before constructing filesystem paths.
- Use safe argument arrays for Git subprocess execution.
- Prevent directory traversal.
- Coordinate concurrent Git metadata operations using appropriate locking.
- Record worktree ownership and task association.

### Worktree limitations

Git worktrees provide source-tree isolation, not complete security isolation.

Agents may still share:

- Git object storage.
- Environment variables.
- Package caches.
- Network access.
- External databases.
- Development ports.
- Other host resources.

The implementation must not claim that worktrees are equivalent to containers or operating-system sandboxes.

### Acceptance criteria

- Two agents can edit different isolated worktrees.
- Changes in one worktree do not modify files in the other.
- Dirty worktree removal requires explicit confirmation or is rejected.
- Worktree status survives application restart.
- Detached HEAD and invalid Git state are represented clearly.
- Failed worktree creation does not leave inconsistent application records.

---

## FR-10: Development Task Management

Priority: P1

Add development tasks if upstream task management does not already satisfy the requirements.

Reuse existing task infrastructure where practical.

### Task fields

- Task ID.
- Title.
- Description.
- Workspace ID.
- Project ID.
- Repository ID.
- Parent task ID.
- Task type.
- Priority.
- Status.
- Acceptance criteria.
- Assigned agent.
- Assigned human.
- Related coding sessions.
- Git branch.
- Worktree.
- GitHub issue reference.
- Pull request reference.
- Dependencies.
- Created date.
- Updated date.
- Completion date.
- Blocker information.
- Test evidence.

### Task types

- Feature.
- Bug.
- Refactor.
- Documentation.
- Research.
- Testing.
- Security.
- Infrastructure.
- Maintenance.

### Task priorities

- P0 — Critical.
- P1 — High.
- P2 — Normal.
- P3 — Low.

### Task lifecycle

- Backlog.
- Ready.
- Planning.
- In Progress.
- Testing.
- In Review.
- Changes Requested.
- Blocked.
- Ready to Merge.
- Done.
- Cancelled.

### Required views

- Kanban board.
- Task list.
- My assigned tasks.
- Agent task queue.
- Repository-specific tasks.
- Project-wide tasks.
- Blocked tasks.
- Completed tasks.

### Required functionality

- Create task.
- Edit task.
- Assign task.
- Set priority.
- Set acceptance criteria.
- Associate issue.
- Set dependency.
- Start coding session.
- Track execution history.
- Update status.
- Reopen task.
- Archive task.
- Cancel task.

### Definition of Done

A coding task must not be marked Done solely because an AI agent says it has finished.

Depending on task type, completion requires:

- Acceptance criteria verification.
- Relevant tests.
- Review result.
- Recorded code changes.
- Pull request or commit reference.
- Required human approval.

Research and non-code tasks may use a different completion policy.

Acceptance criteria:

- Tasks are correctly scoped.
- Agent runtime status and task status remain distinguishable.
- Task status history is available.
- Blockers are recorded explicitly.
- Project dashboards reflect current task state.

---

## FR-11: Git Status and Diff Viewer

Priority: P2

Provide essential repository inspection functionality.

The application is not intended to implement a complete IDE.

### Required capabilities

- View current branch.
- View changed files.
- View staged files.
- View untracked files.
- View Git diff.
- View staged diff.
- View commit history.
- View commit details.
- Compare branch against base branch.
- View worktree-specific changes.
- Identify merge conflicts.
- Open file in an external editor.

### Diff viewer requirements

- Unified diff.
- Split diff when feasible.
- Added and deleted line indicators.
- File-level navigation.
- Syntax highlighting using existing UI capabilities.
- Large-file handling.
- Binary-file handling.
- Clear staged and unstaged distinctions.

### Safety rules

- Read-only inspection by default.
- Do not execute repository content when displaying diffs.
- Escape untrusted HTML and Markdown where appropriate.
- Do not load excessively large files without limits.
- Never silently revert changes.

Acceptance criteria:

- User can inspect agent-generated changes without leaving OpenBot.
- Diff data reflects the selected repository or worktree.
- Large or binary files do not crash the UI.
- Merge conflicts are clearly indicated.

---

## FR-12: GitHub Integration

Priority: P2

Integrate repository development management with GitHub.

Prefer existing upstream GitHub connectors or authenticated GitHub CLI functionality.

Do not create unnecessary duplicate authentication systems.

### Required functionality

- Detect GitHub repository owner and name.
- List issues.
- View issue details.
- Import issue as task.
- Associate local task with issue.
- Create issue when authorized.
- List pull requests.
- View pull request details.
- Create pull request.
- View CI and check status.
- View review status.
- Link coding session to pull request.

### GitHub Projects integration

Optional advanced functionality:

- Synchronize task status.
- Display project board items.
- Map local statuses to GitHub Projects fields.
- Display synchronization conflicts.
- Allow manual resolution.

Define the authoritative source for every synchronized field.

Prevent repeated imports, update loops, and accidental remote overwrites.

### Authentication

Support existing authorized credentials where available:

- Existing OpenBot integration.
- GitHub CLI authentication.
- Supported OAuth integration.
- Approved GitHub App integration.

Never store raw tokens in ordinary application logs or task descriptions.

### Approval requirements

Require explicit approval for:

- Merging pull requests.
- Closing issues where approval is configured.
- Deleting branches on remote repositories.
- Changing protected branch configuration.
- Publishing releases.
- Force-pushing.
- Modifying repository secrets.

Acceptance criteria:

- Imported issues retain their original external identity.
- Reimporting an issue does not create duplicate tasks.
- Pull request status can be inspected.
- Creating a pull request requires correct repository context.
- Failed GitHub API requests are visible and retryable.

---

## FR-13: Project Dashboard

Priority: P0 for basic version; P2 for advanced analytics.

The project dashboard must provide an overview of development activity.

### Summary metrics

- Total repositories.
- Active agents.
- Running sessions.
- Open tasks.
- Blocked tasks.
- Pending reviews.
- Active worktrees.
- Open pull requests.

### Dashboard sections

1. Recent activity.
2. Active coding sessions.
3. Repository health.
4. Agent status.
5. Pending approvals.
6. Current tasks.
7. Recent commits.
8. Failed executions.
9. Upcoming scheduled workflows.

### Repository health indicators

- Available.
- Missing.
- Dirty.
- Merge conflict.
- Detached HEAD.
- Remote host unavailable.
- Authentication required.

Avoid presenting inferred status as confirmed state.

Display the last refresh time for potentially stale data.

Acceptance criteria:

- Dashboard displays data for the selected project.
- Switching projects refreshes the appropriate metrics.
- Running and failed tasks can be opened directly.
- Basic dashboard works without GitHub authentication.

---

## FR-14: Autonomous Coding Workflows

Priority: P2

Extend the existing workflow engine with repository-aware context.

### Standard development workflow

1. Receive development task.
2. Analyze task.
3. Read applicable project and repository instructions.
4. Generate implementation plan.
5. Request planning approval if configured.
6. Create or select isolated worktree.
7. Assign developer agent.
8. Implement changes.
9. Run relevant tests.
10. Assign reviewer agent.
11. Address review feedback.
12. Verify acceptance criteria.
13. Create pull request when authorized.
14. Request human merge approval.
15. Update task status.
16. Archive execution metadata.
17. Offer safe worktree cleanup.

### Example role distribution

- Claude Code: Tech Lead.
- Codex: Developer.
- Claude Code: Reviewer.
- Codex: Test and regression investigation.

This distribution is a configurable example, not a fixed requirement.

### Workflow features

- Project-scoped workflow templates.
- Repository-scoped workflow execution.
- Conditional execution.
- Human approval steps.
- Retry policy.
- Timeout policy.
- Cancellation.
- Artifact references.
- Step execution logs.
- Maximum review iterations.
- Maximum execution or cost budgets where supported.
- Failure recovery.
- Manual resume.

### Failure behavior

If tests fail:

- Record failed commands.
- Record relevant output.
- Return task to the developer or mark it blocked.
- Never silently mark the task successful.

If an agent crashes:

- Preserve available logs.
- Preserve the worktree.
- Mark execution interrupted or failed.
- Offer appropriate recovery actions.

If approval is rejected:

- Stop the protected action.
- Preserve the reason.
- Do not attempt alternative methods to bypass approval.

Acceptance criteria:

- Workflow execution preserves repository identity across steps.
- Delegated agents receive correct task context.
- Repeated steps do not duplicate branches or pull requests.
- Review loops have configurable limits.
- Human approval is enforced at protected boundaries.

---

## FR-15: Cross-Repository Development

Priority: P3

Support projects containing multiple repositories.

Example:

Task: Add a new backend endpoint and update the desktop client.

Affected repositories:

- Mabar Backend.
- Mabar Desktop.
- Mabar Web.

### Required functionality

- Create project-level parent task.
- Associate repository-specific subtasks.
- Track dependencies between tasks.
- Assign different agents to different repositories.
- Maintain isolated worktrees for each repository.
- Track multiple related pull requests.
- Coordinate review and merge order.
- Display cross-repository progress.

### Example execution

Parent task: Implement new media API.

Subtasks:

- Backend: Implement endpoint.
- Desktop: Update API client.
- Web: Update interface.
- QA: Verify cross-repository compatibility.

### Safety rules

- Each write-enabled execution targets an explicit repository or separately approved multi-root context.
- Project Lead agents may coordinate multiple repositories but do not automatically receive unrestricted filesystem access.
- Dependency changes must be traceable.
- Merging one repository does not automatically authorize merging other repositories.

Acceptance criteria:

- Parent task status reflects required subtask completion.
- Each repository maintains independent branch and session history.
- Cross-repository changes can be reviewed individually.
- Partial completion remains visible.

---

## FR-16: Execution Host Management

Priority: P1 for context compatibility; P3 for advanced management.

Preserve the existing OpenBot server architecture.

### Host types

- Local desktop.
- Existing remote OpenBot server.
- Other supported execution environments discovered during audit.

### Host metadata

- Host ID.
- Host name.
- Operating system.
- Connection status.
- Available providers.
- Registered repositories.
- Agent capacity.
- Last seen time.
- Supported capabilities.

### Required behavior

- Every repository belongs to a known execution host.
- Sessions execute on the intended host.
- Remote paths are resolved on the remote host.
- Host unavailability does not silently redirect execution to the local computer.
- Repository relocation requires explicit user action.

### Advanced resource monitoring

Optional:

- CPU usage.
- RAM usage.
- Disk usage.
- Active processes.
- Active coding sessions.
- Queue depth.
- Maximum concurrency.

Acceptance criteria:

- Same path on two different hosts is treated as a distinct location.
- Offline host status is visible.
- Remote sessions do not receive local-only path assumptions.
- Existing remote connectivity continues to work.

---

## FR-17: Agent Activity and Monitoring

Priority: P1

Provide a unified view of AI coding activity.

### Required information

- Agent name.
- Provider.
- Model.
- Project.
- Repository.
- Task.
- Session.
- Worktree.
- Current state.
- Last activity.
- Execution duration.
- Current step when available.
- Pending approval.
- Error or blocker.

### Required controls

- Open session.
- View execution logs.
- Request cancellation.
- Resume when supported.
- Retry eligible failed task.
- Respond to approval.
- Navigate to task.
- Navigate to repository.

Preserve existing Agent Dock and Dynamic Island behavior.

If practical, add project and repository indicators to existing monitoring components.

Do not implement a second competing agent monitoring system.

---

## FR-18: File Explorer and External Editor

Priority: P2

Provide lightweight repository navigation.

### Required functionality

- Display repository directory tree.
- Search filenames.
- Open text file.
- Display file preview.
- Open file in external editor.
- Open terminal in repository.
- Copy repository path.
- Reveal directory in operating-system file manager.

### Out of scope

- Full language server integration.
- Full debugger implementation.
- Complete IDE text editor replacement.
- Reimplementation of VS Code extensions.

### Security

- Do not automatically render executable HTML.
- Treat symlinks carefully.
- Do not traverse outside authorized roots without explicit permission.
- Respect file-size limits.
- Avoid reading sensitive files unnecessarily.
- Use existing host-aware filesystem mechanisms.

---

# 7. UX AND UI SPECIFICATION

## 7.1 Navigation architecture

The application sidebar must support both project-scoped and global navigation.

### Proposed sidebar

WORKSPACES

- BharataCorp
  - Mabar Ecosystem
    - Mabar Desktop
    - Mabar Backend
    - Mabar Web
    - Flow Automation
  - OpenShorts
  - Digital Invitation

GLOBAL

- All Agents
- All Channels
- All Sessions
- All Tasks
- Workflows
- Servers
- Providers
- Settings

## 7.2 Repository view tabs

Suggested tabs:

- Overview.
- Sessions.
- Agents.
- Tasks.
- Channels.
- Git.
- Files.
- Knowledge.
- Settings.

The actual navigation must reuse existing OpenBot design patterns where possible.

## 7.3 Main application layout

### Left sidebar

Workspace, project, repository, and global navigation.

### Main content area

Selected project, repository, session, task, channel, or workflow.

### Optional right inspector panel

Contextual information:

- Selected agent.
- Active repository.
- Working directory.
- Git branch.
- Worktree.
- Task details.
- Approval requests.
- Recent execution events.

## 7.4 Persistent repository context bar

When interacting with a coding agent, display:

Project > Repository > Branch > Worktree

Additional indicators:

- Provider.
- Model.
- Host.
- Permission profile.

A user must not need to inspect hidden settings to understand where an agent is modifying code.

## 7.5 New session flow

1. Select repository.
2. Click New Coding Session.
3. Select provider or existing agent.
4. Choose optional task.
5. Choose working-tree mode.
6. Start conversation.

Working-tree modes:

- Read-only repository inspection.
- Existing worktree.
- New isolated worktree.
- Primary working tree with explicit write authorization.

Provide reasonable defaults to minimize setup friction.

## 7.6 Empty states

Provide useful empty states for:

- No workspace.
- No project.
- No repository.
- No coding session.
- No agent.
- No task.
- No worktree.
- Disconnected provider.
- Offline execution host.

Empty states should guide the user toward the next valid action.

## 7.7 Design principles

- Preserve the existing OpenBot visual identity unless rebranding is explicitly approved.
- Reuse existing components.
- Maintain dark and light mode compatibility.
- Use clear status indicators.
- Provide compact layouts suitable for developers.
- Support keyboard navigation.
- Avoid unnecessary modal dialogs.
- Avoid excessive dashboard decoration.
- Prefer practical information density.
- Ensure long repository names and paths remain usable.

## 7.8 Keyboard shortcuts

Proposed shortcuts, subject to existing shortcut compatibility:

- Ctrl+K: Global search or command palette.
- Ctrl+Shift+P: Project switcher.
- Ctrl+Shift+N: New coding session.
- Ctrl+Shift+T: New development task.

Do not override existing shortcuts without auditing conflicts.

---

# 8. TECHNICAL ARCHITECTURE

## 8.1 Architecture strategy

Use an additive project management domain on top of existing OpenBot infrastructure.

Proposed conceptual layers:

1. Existing OpenBot UI.
2. Project and repository navigation.
3. Project management domain services.
4. Repository context resolver.
5. Session and task associations.
6. Git operations service.
7. Existing agent execution runtime.
8. Existing provider adapters.
9. Existing host and transport infrastructure.
10. Durable storage.

These are conceptual boundaries, not confirmed upstream module names.

## 8.2 Proposed domain services

Suggested responsibilities:

### WorkspaceService

- Workspace lifecycle.
- Workspace defaults.
- Workspace membership associations.

### ProjectService

- Project lifecycle.
- Project metadata.
- Project entity associations.
- Project dashboard aggregation.

### RepositoryService

- Repository registration.
- Repository validation.
- Repository metadata.
- Host-specific paths.

### RepositoryContextResolver

- Resolve project and repository.
- Resolve task and session.
- Select worktree.
- Validate effective working directory.
- Resolve permissions.
- Return immutable execution context.

### CodingSessionService

- Session lifecycle.
- Session-to-repository association.
- Provider resume references.
- Execution history.

### GitService

- Safe Git command execution.
- Repository discovery.
- Branch inspection.
- Git status.
- Git diff.
- Commit inspection.

### WorktreeService

- Worktree lifecycle.
- Worktree locking.
- Worktree ownership.
- Cleanup safety.

### TaskService

- Task lifecycle.
- Task assignment.
- Dependencies.
- Completion policy.

### KnowledgeResolver

- Applicable instructions.
- Knowledge scope.
- Context provenance.
- Provider compatibility.

### IntegrationService

- GitHub issue synchronization.
- Pull request integration.
- External identifier mapping.

The actual implementation may use fewer or differently named services if the upstream architecture provides equivalent boundaries.

## 8.3 Runtime execution context

Conceptual TypeScript interface:

```ts
interface RepositoryExecutionContext {
  workspaceId?: string;
  projectId?: string;
  repositoryId?: string;
  taskId?: string;
  sessionId: string;
  agentId: string;
  providerId: string;
  hostId: string;
  workingDirectory: string;
  worktreeId?: string;
  branch?: string;
  permissionProfileId?: string;
  readOnly: boolean;
}
```

The interface is a proposed contract.

Adapt it to upstream runtime structures.

## 8.4 Context immutability

An execution context must be immutable after a running coding task starts.

The user switching the currently visible project must not change:

- Running process working directory.
- Agent repository.
- Worktree.
- Effective permissions.
- Task association.

Changing repository requires a new execution or an explicitly controlled session transition.

## 8.5 Provider integration

Use existing upstream Claude Code and Codex integrations.

Add repository context at the appropriate launch boundary.

Do not implement provider authentication from scratch unless absolutely necessary.

Provider adapters should expose or map capabilities such as:

- Start session.
- Resume session.
- Cancel execution.
- Read execution status.
- Receive events.
- Request approval.
- Set working directory.
- Configure supported permissions.

Exact provider APIs must be verified during Phase 0.

---

# 9. DATA MODEL

## 9.1 Important note

The following schema is conceptual.

The implementing agent must inspect the actual upstream schema before creating migrations.

Do not create duplicate tables if existing tables can be extended safely.

Prefer nullable associations and additive migrations where appropriate.

## 9.2 Proposed entities

### Workspaces

- id
- name
- description
- icon
- settings
- created_at
- updated_at
- archived_at

### Projects

- id
- workspace_id
- name
- description
- icon
- color
- sort_order
- settings
- created_at
- updated_at
- archived_at

### Repositories

- id
- host_id
- name
- canonical_path
- remote_url
- default_branch
- repository_type
- settings
- created_at
- updated_at
- archived_at

### Project repositories

- project_id
- repository_id
- sort_order
- created_at

Use a join entity if repositories can be associated with multiple projects.

### Agent scope associations

- id
- agent_id
- scope_type
- scope_id
- role
- configuration_overrides
- created_at

Reuse existing agent entities.

### Coding sessions

- id
- project_id
- repository_id
- task_id
- agent_id
- provider_id
- provider_session_ref
- host_id
- working_directory
- worktree_id
- title
- status
- created_at
- updated_at
- archived_at

Reuse or extend upstream conversation and session storage when possible.

### Worktrees

- id
- repository_id
- host_id
- task_id
- branch_name
- base_ref
- canonical_path
- managed_by_application
- lifecycle_status
- created_at
- updated_at
- archived_at

### Development tasks

- id
- project_id
- repository_id
- parent_task_id
- title
- description
- acceptance_criteria
- task_type
- priority
- status
- assigned_agent_id
- external_issue_ref
- external_pr_ref
- blocker_reason
- created_at
- updated_at
- completed_at
- archived_at

### Task dependencies

- task_id
- depends_on_task_id

### Scope associations for existing entities

Add appropriate associations for:

- Channels.
- Workflows.
- Skills.
- Knowledge.
- Memory references.

### Execution events

Reuse existing event storage where possible.

Conceptual event fields:

- id
- execution_id
- project_id
- repository_id
- task_id
- session_id
- event_type
- payload
- created_at

## 9.3 Relationship requirements

- A workspace contains multiple projects.
- A project may contain multiple repositories.
- A repository may have multiple worktrees.
- A repository may have multiple coding sessions.
- A repository may have multiple tasks.
- A task may have multiple sessions.
- A task may depend on other tasks.
- An agent may have multiple scope associations.
- A worktree must belong to exactly one registered repository.
- A running execution must have a resolved host and working directory.

## 9.4 Database migration requirements

- Back up existing data before migration.
- Use versioned migrations.
- Preserve existing identifiers.
- Existing agents and conversations must remain accessible.
- Unscoped entities remain global.
- Do not automatically assign existing sessions to projects based on guesses.
- Support explicit user-driven association of existing sessions.
- Test migration against a representative upstream database.
- Test fresh installations.
- Test repeated startup after migration.
- Document database rollback limitations.
- Do not introduce destructive schema changes without approval.

---

# 10. API AND IPC REQUIREMENTS

The application must use existing upstream transport conventions.

Do not introduce an unnecessary HTTP server if the existing IPC or server API already provides the required capability.

Conceptual operations:

## Project operations

- project.create
- project.list
- project.get
- project.update
- project.archive
- project.restore

## Repository operations

- repository.import
- repository.clone
- repository.list
- repository.get
- repository.validate
- repository.refresh
- repository.associate
- repository.detach

## Session operations

- session.create
- session.list
- session.get
- session.resume
- session.cancel
- session.archive

## Worktree operations

- worktree.list
- worktree.create
- worktree.inspect
- worktree.remove
- worktree.refresh

## Task operations

- task.create
- task.update
- task.assign
- task.transition
- task.list
- task.get

## Git operations

- git.status
- git.branches
- git.diff
- git.log
- git.inspectCommit

## Security requirements

Every operation must validate:

- Caller authorization.
- Entity ownership.
- Applicable scope.
- Execution host.
- Filesystem path.
- Input schema.
- Protected-action approval.

Never trust a project ID, repository ID, or filesystem path merely because it was supplied by the renderer UI.

---

# 11. SECURITY AND PERMISSION MODEL

## 11.1 Permission profiles

Provide or reuse permission profiles compatible with existing upstream security architecture.

Conceptual profiles:

### Read Only

- Inspect repository.
- Read allowed documentation.
- Inspect Git state.
- No repository modification.

### Repository Write

- Modify authorized repository or worktree.
- Execute approved development commands.
- No unrelated repository access by default.

### Ask First

- Request approval for protected operations.

### Advanced Access

- Broader access only after explicit user configuration.

Do not present repository scoping as a strong filesystem sandbox unless technically enforced.

## 11.2 Protected operations

Explicit approval is required for high-risk actions, including:

- Deleting repository directories.
- Force-pushing.
- Hard-resetting branches containing changes.
- Removing dirty worktrees.
- Deleting unmerged branches.
- Merging pull requests.
- Production deployments.
- Publishing releases.
- Accessing credentials outside the configured provider.
- Changing security permissions.
- Modifying infrastructure secrets.

## 11.3 Filesystem security

- Validate canonical paths.
- Prevent path traversal.
- Validate symlink boundaries.
- Use host-aware filesystem checks.
- Use argument-safe subprocess execution.
- Do not interpolate untrusted user input into shell commands.
- Restrict managed worktree cleanup to verified directories.
- Avoid unsafe automatic file deletion.

## 11.4 Credential handling

- Reuse secure upstream credential storage.
- Never print secrets in logs.
- Never commit tokens or credentials.
- Redact sensitive environment variables.
- Do not expose tokens to renderer processes unnecessarily.
- Respect provider authentication requirements.

## 11.5 Prompt injection defense

Repository content, issue descriptions, pull request comments, and external documentation may contain malicious instructions.

The application and coding agent must treat these as untrusted data.

External content cannot:

- Expand granted permissions.
- Authorize credential disclosure.
- Disable human approval.
- Override the execution repository.
- Bypass security policies.
- Authorize arbitrary remote execution.

## 11.6 Audit trail

Record protected action requests and outcomes.

Include:

- Actor.
- Project.
- Repository.
- Task.
- Execution.
- Requested action.
- Approval result.
- Timestamp.
- Result.

Avoid storing unnecessary secrets or sensitive content.

---

# 12. NON-FUNCTIONAL REQUIREMENTS

## 12.1 Performance

- Project navigation should remain responsive.
- Avoid scanning all repositories on every navigation event.
- Refresh Git metadata asynchronously.
- Debounce filesystem events.
- Use pagination or virtualization for large lists.
- Avoid blocking the renderer with Git subprocess operations.
- Handle large repositories and long commit histories.

Initial UX target:

- Warm project navigation generally below 300 ms on representative development hardware, excluding external requests.
- Long Git operations must show a loading state without freezing navigation.

Measure performance rather than claiming compliance without benchmarks.

## 12.2 Reliability

- Preserve session and task metadata across restart.
- Recover from unexpected process termination.
- Detect stale worktree metadata.
- Preserve failed execution logs.
- Handle provider authentication expiration.
- Handle unavailable remote hosts.
- Avoid duplicated operations during retries.

## 12.3 Compatibility

Preserve:

- Existing OpenBot agents.
- Existing conversations.
- Existing channels.
- Existing workflows.
- Existing provider configurations.
- Existing skills.
- Existing remote server functionality.

Prioritize Linux desktop.

Ensure changes do not unnecessarily break Windows, macOS, mobile, or web clients.

Cross-platform parity may be delivered in later phases.

## 12.4 Maintainability

- Modular code.
- Clear domain boundaries.
- Typed interfaces.
- Versioned migrations.
- Documented architectural decisions.
- Automated tests.
- Small reviewable changes.
- Minimal upstream modifications.

## 12.5 Observability

Provide structured events or logs for:

- Repository import.
- Context resolution.
- Session startup.
- Worktree creation.
- Agent execution.
- Task transitions.
- Workflow steps.
- Approval requests.
- Provider errors.
- Migration failures.

## 12.6 Accessibility

- Keyboard navigation.
- Focus management.
- Accessible labels.
- Clear error messages.
- Adequate color contrast.
- Status represented with text, not color alone.

---

# 13. ERROR HANDLING

The system must provide explicit, actionable errors.

Proposed normalized error categories:

- REPOSITORY_NOT_FOUND
- INVALID_GIT_REPOSITORY
- REPOSITORY_ALREADY_REGISTERED
- EXECUTION_HOST_UNAVAILABLE
- INVALID_EXECUTION_CONTEXT
- WORKING_DIRECTORY_MISMATCH
- WORKTREE_CREATION_FAILED
- WORKTREE_HAS_UNCOMMITTED_CHANGES
- BRANCH_ALREADY_EXISTS
- PROVIDER_NOT_AUTHENTICATED
- PROVIDER_RESUME_NOT_SUPPORTED
- AGENT_EXECUTION_FAILED
- APPROVAL_REQUIRED
- PERMISSION_DENIED
- TASK_DEPENDENCY_BLOCKED
- GITHUB_AUTH_REQUIRED
- GITHUB_RATE_LIMITED
- MIGRATION_FAILED

Error identifiers are proposed and may be adapted to upstream conventions.

Every relevant error should provide:

- User-readable explanation.
- Affected repository.
- Affected task or session.
- Recovery action when available.
- Technical details for debugging.
- Safe logs without credentials.

Never silently fall back to another repository.

---

# 14. FEATURE FLAGS

Use existing feature flag mechanisms if available.

Otherwise, implement a minimal configurable mechanism only when necessary.

Proposed flags:

- PROJECT_MANAGEMENT_ENABLED
- REPOSITORY_CONTEXT_ENABLED
- CODING_SESSIONS_ENABLED
- PROJECT_AGENT_SCOPE_ENABLED
- PROJECT_CHANNELS_ENABLED
- WORKTREE_MANAGER_ENABLED
- DEVELOPMENT_TASKS_ENABLED
- GIT_DIFF_VIEWER_ENABLED
- GITHUB_INTEGRATION_ENABLED
- CROSS_REPOSITORY_ENABLED
- CODING_WORKFLOWS_ENABLED

During development, incomplete features should remain disabled by default.

Feature flags must not bypass permissions or license restrictions.

Disabling project management must not delete project data.

---

# 15. UPSTREAM FORK STRATEGY

## 15.1 Repository strategy

Maintain:

- origin: User-controlled fork.
- upstream: Original OpenBot repository.

Original upstream:

https://github.com/nightly-labs/openbot

Do not invent the final fork repository name without confirming availability and authorization.

## 15.2 Branch strategy

Suggested branches:

- main
- chore/phase-0-upstream-audit
- feat/phase-1-project-core
- feat/phase-2-coding-sessions
- feat/phase-3-worktree-manager
- feat/phase-4-development-tasks
- feat/phase-5-git-review
- feat/phase-6-coding-workflows
- feat/phase-7-cross-repository
- chore/upstream-sync

## 15.3 Upstream compatibility requirements

- Record upstream base commit.
- Record upstream version.
- Track modified upstream files.
- Prefer extension modules.
- Avoid unrelated formatting changes.
- Avoid large-scale renaming.
- Avoid unnecessary dependency upgrades.
- Document every modification to the agent runtime.
- Maintain compatibility adapters where useful.

## 15.4 Upstream synchronization

Proposed process:

1. Fetch upstream.
2. Review upstream changes.
3. Identify conflicts with custom modules.
4. Create synchronization branch.
5. Merge or rebase according to documented strategy.
6. Run migration tests.
7. Run regression tests.
8. Run application build.
9. Perform smoke tests.
10. Create pull request for review.

Do not automatically merge upstream changes into the production branch.

## 15.5 Release strategy

Audit existing:

- Application identifiers.
- Package identifiers.
- Auto-update configuration.
- Release signing.
- Release artifacts.
- Distribution endpoints.
- Branding requirements.

The fork must not accidentally publish to official upstream release infrastructure.

Any fork-specific updater must use authorized release infrastructure and appropriate signing.

Until release configuration is verified, use development builds.

---

# 16. LICENSE AND LEGAL REQUIREMENTS

Phase 0 must verify the exact license at the selected upstream commit.

OpenBot has been identified as using PolyForm Noncommercial License 1.0.0, but the implementing agent must verify the current repository license and any additional terms.

Source availability does not automatically grant unrestricted commercial use.

Required actions:

- Read LICENSE.
- Read NOTICE files, if present.
- Review commercial licensing documentation.
- Audit dependencies.
- Identify trademark or branding restrictions.
- Identify cloud service terms.
- Identify provider-specific terms.
- Document permitted and restricted use cases.
- Preserve copyright and attribution notices.

Do not:

- Remove license restrictions.
- Bypass license validation.
- Circumvent paid services.
- Reuse official credentials.
- Impersonate the original product.
- Assume a public or private fork grants commercial rights.

Commercial production deployment is blocked until appropriate rights and permissions have been confirmed.

Noncommercial experimentation may proceed only within the verified applicable terms.

---

# 17. IMPLEMENTATION ROADMAP

## PHASE 0 — Upstream Audit and Foundation

Priority: Mandatory prerequisite.

### Objectives

Establish an accurate understanding of upstream and verify that the application can be developed and tested safely.

### Tasks

- Verify repository URL.
- Inspect LICENSE and applicable terms.
- Record upstream commit.
- Inspect repository structure.
- Identify package manager.
- Identify build commands.
- Identify development commands.
- Identify testing commands.
- Identify database technology.
- Identify migration mechanism.
- Identify main and renderer processes.
- Identify server architecture.
- Identify API and IPC boundaries.
- Identify agent lifecycle.
- Identify Claude Code integration.
- Identify Codex integration.
- Identify working-directory configuration.
- Identify conversation persistence.
- Identify existing task infrastructure.
- Identify existing channels.
- Identify existing skill system.
- Identify existing memory architecture.
- Identify workflow engine.
- Identify existing Git functionality.
- Identify existing project-related functionality.
- Identify updater and release configuration.
- Build upstream application.
- Run existing tests.
- Record pre-existing failures.

### Deliverables

- docs/UPSTREAM_AUDIT.md
- docs/LICENSE_AUDIT.md
- docs/FEATURE_INVENTORY.md
- docs/ARCHITECTURE_CURRENT.md
- docs/ARCHITECTURE_PROPOSED.md
- docs/DATABASE_AUDIT.md
- docs/AGENT_RUNTIME_AUDIT.md
- docs/SECURITY_AUDIT.md
- docs/UPSTREAM_SYNC_STRATEGY.md
- docs/IMPLEMENTATION_PLAN.md
- docs/ACCEPTANCE_TESTS.md
- docs/RISK_REGISTER.md
- docs/TEST_BASELINE.md

### Exit criteria

- Upstream application build verified or blocker documented.
- Existing test baseline recorded.
- License limitations documented.
- Runtime working-directory integration point identified.
- Proposed implementation approved.
- No unrelated product functionality removed.

Do not proceed to major implementation before Phase 0 review.

---

## PHASE 1 — Project and Repository Management Core

Priority: P0.

### Objectives

Create the native project layer.

### Tasks

- Add additive storage schema.
- Add migration.
- Create project service.
- Create repository registration service.
- Add project navigation.
- Add default workspace if appropriate.
- Add Create Project dialog.
- Add Import Repository dialog.
- Validate local Git repositories.
- Display repository metadata.
- Add basic project dashboard.
- Persist project selection.
- Support archive and restore.
- Preserve global navigation.

### Deliverables

- Native project sidebar.
- Repository import.
- Repository metadata.
- Project overview.
- Migration tests.
- UI tests.

### Exit criteria

- At least two distinct repositories can be registered.
- Project switching works.
- Application restart preserves data.
- Existing OpenBot features remain functional.
- Removing a repository association does not delete files.

---

## PHASE 2 — Repository-Aware Coding Sessions and Agent Scope

Priority: P0.

### Objectives

Make Claude Code and Codex reliably execute inside the selected repository.

### Tasks

- Implement repository context resolver.
- Integrate context into agent launch.
- Implement execution preflight.
- Extend existing session storage.
- Add persistent session list.
- Add session context indicator.
- Implement provider resume handling.
- Add project and repository agent associations.
- Add basic scoped channel functionality.
- Preserve global agents.
- Add context isolation tests.

### Exit criteria

- Claude Code starts in Repository A.
- Codex starts in Repository B.
- Both use the expected working directory.
- Switching UI project does not change running execution context.
- Sessions are reopenable.
- Native provider resume is verified when supported.
- Missing directories produce explicit errors.
- Existing unscoped agents continue functioning.

This phase completes the initial MVP together with Phase 1.

---

## PHASE 3 — Git Worktree and Parallel Development

Priority: P1.

### Objectives

Enable safe parallel code modification.

### Tasks

- Implement safe Git command wrapper.
- Detect existing worktrees.
- Create managed worktree.
- Create task branches.
- Add worktree status.
- Associate sessions with worktrees.
- Implement concurrency coordination.
- Implement dirty-worktree protection.
- Implement cleanup confirmation.
- Add parallel execution tests.

### Exit criteria

- Two agents can work on separate worktrees.
- Primary working tree remains unchanged.
- Dirty worktrees cannot be silently deleted.
- Application restart preserves worktree associations.
- Failed creation is recoverable.

---

## PHASE 4 — Development Tasks and Project Knowledge

Priority: P1.

### Objectives

Provide structured engineering task management.

### Tasks

- Extend or reuse existing tasks.
- Implement development task lifecycle.
- Add repository task view.
- Add project task view.
- Add Kanban board.
- Add acceptance criteria.
- Add agent assignment.
- Add task dependencies.
- Associate coding sessions.
- Detect repository instruction files.
- Add project knowledge associations.
- Add scoped context visibility.
- Add basic project monitoring.

### Exit criteria

- A task can launch a scoped coding session.
- Task progress is traceable.
- Task completion includes appropriate evidence.
- Repository knowledge does not leak into unrelated project contexts.
- Dashboard reflects task and agent states.

---

## PHASE 5 — Git Review and GitHub Integration

Priority: P2.

### Objectives

Provide complete code review visibility and external issue integration.

### Tasks

- Add Git status view.
- Add diff viewer.
- Add commit history.
- Add external editor integration.
- Add GitHub authentication integration.
- Import GitHub issues.
- Associate issue with task.
- Create pull request when authorized.
- Display PR and CI status.
- Add protected merge approval.

### Exit criteria

- Agent changes are inspectable in application.
- Issues import without duplicates.
- PRs target the correct repository.
- Unauthorized merge attempts are rejected.
- CI and review failures are visible.

---

## PHASE 6 — Autonomous Coding Workflows

Priority: P2.

### Objectives

Automate multi-agent development pipelines.

### Tasks

- Extend workflow context.
- Add planning template.
- Add developer assignment.
- Add reviewer assignment.
- Add testing steps.
- Add bounded review loops.
- Add approval steps.
- Add retry and recovery.
- Add pull request creation.
- Add workflow execution logs.

### Exit criteria

- A development task can move through planning, implementation, testing, and review.
- Context remains correct across agent delegation.
- Failed tests block completion.
- Protected actions require approval.
- Review loops terminate within configured limits.

---

## PHASE 7 — Cross-Repository and Remote Development

Priority: P3.

### Objectives

Enable coordination of interconnected repositories and remote execution hosts.

### Tasks

- Add advanced workspace management.
- Add project-level parent tasks.
- Add cross-repository dependencies.
- Add coordinated agent assignment.
- Add merge-order visualization.
- Add remote repository registration.
- Add host health monitoring.
- Add advanced concurrency management.
- Add optional cross-platform UI parity.

### Exit criteria

- Parent task coordinates changes across multiple repositories.
- Repository-specific worktrees remain isolated.
- Remote execution uses correct host context.
- Partial progress and blockers are visible.
- Existing OpenBot remote features remain functional.

---

# 18. MVP DEFINITION

The MVP consists of Phase 1 and Phase 2 after successful Phase 0.

## MVP must include

- Native Projects menu.
- Repository import.
- Repository validation.
- Project-to-repository association.
- Project switcher.
- Basic project dashboard.
- Repository-scoped coding sessions.
- Correct agent working directory.
- Claude Code integration.
- Codex integration.
- Project and repository agent associations.
- Basic channel association.
- Persistent session history.
- Visible repository context.
- Backward-compatible data migration.
- Automated tests.

## MVP explicitly excludes

- Full Kanban implementation.
- Full GitHub Projects synchronization.
- Advanced Git diff editor.
- Automatic pull request workflows.
- Cross-repository orchestration.
- Advanced remote scheduling.
- Full IDE functionality.
- Complete mobile feature parity.
- Advanced analytics.
- Unnecessary redesign of all OpenBot screens.

The purpose of MVP is to validate the project-centric architecture with minimal modifications to upstream.

---

# 19. TESTING STRATEGY

## 19.1 Unit tests

Required coverage:

- Project validation.
- Repository metadata validation.
- Duplicate repository detection.
- Context resolution.
- Scope associations.
- Path validation.
- Worktree ownership.
- Task status transitions.
- Permission checks.
- Error normalization.

## 19.2 Integration tests

Required coverage:

- Repository registration with real temporary Git repositories.
- Project persistence.
- Database migrations.
- Session context persistence.
- Working-directory propagation.
- Provider adapter integration.
- Git worktree lifecycle.
- Task-to-session association.
- Host-specific repository resolution.
- Permission enforcement at execution boundaries.

## 19.3 End-to-end tests

Use the existing upstream E2E framework if available.

Otherwise, propose a suitable approach before adding dependencies.

Test:

- Create project.
- Import repository.
- Start coding session.
- Switch project.
- Reopen session.
- Start parallel sessions.
- Restart application.
- Inspect Git changes.
- Request protected action.
- Reject protected action.
- Verify no unauthorized changes.

## 19.4 Security tests

Test:

- Directory traversal attempts.
- Malicious repository paths.
- Shell injection inputs.
- Symlink escape attempts.
- Invalid host association.
- Cross-project data access.
- Unauthorized worktree deletion.
- Approval bypass attempts.
- Credential leakage in logs.
- Untrusted repository instructions.

## 19.5 Migration tests

Test:

- Fresh database.
- Existing upstream database.
- Existing database containing agents and conversations.
- Partially migrated database.
- Repeated application startup.
- Migration failure recovery.
- Backup restoration procedures.

## 19.6 Regression tests

Run the existing upstream test suite.

New changes must not introduce unexplained regressions.

Pre-existing failures must be recorded separately from new failures.

## 19.7 Provider smoke tests

Run controlled smoke tests using configured Claude Code and Codex accounts when authorized.

Use disposable Git repositories.

Example:

Repository A contains marker file A.

Repository B contains marker file B.

Start an agent in each repository.

Verify:

- Actual process working directory.
- Expected marker file.
- Expected repository root.
- No unintended modification of unrelated repository.
- Provider session identity.
- Session resume behavior.

Mock tests alone are insufficient to claim real provider integration has been verified.

---

# 20. ACCEPTANCE TEST MATRIX

## AT-01: Project creation

Given an existing workspace, when the user creates a project, the project appears in navigation and persists after restart.

## AT-02: Repository import

Given a valid Git repository, when imported, its canonical path, host, and Git metadata are registered correctly.

## AT-03: Invalid repository

Given an invalid folder, the system provides a useful error and creates no invalid repository record.

## AT-04: Repository isolation

Given Repository A and Repository B, when a coding session is created for Repository A, execution begins in Repository A.

## AT-05: Project switching

Given a running session in Repository A, when the user navigates to Repository B, the running execution remains associated with Repository A.

## AT-06: Claude Code

Given a configured Claude Code provider, a repository-scoped session executes in the correct directory.

## AT-07: Codex

Given a configured Codex provider, a repository-scoped session executes in the correct directory.

## AT-08: Session persistence

Given an existing session, application restart preserves its project, repository, and history.

## AT-09: Provider resume

Given a provider supporting session resume, the original native session is resumed successfully or an explicit error is displayed.

## AT-10: Worktree isolation

Given two write-enabled tasks for the same repository, isolated worktrees prevent unintended file overlap.

## AT-11: Dirty worktree protection

Given a worktree with uncommitted changes, automatic cleanup is rejected.

## AT-12: Task lifecycle

Given a development task with incomplete acceptance criteria, the task cannot be falsely reported as completed under the configured completion policy.

## AT-13: Migration compatibility

Given an upstream database, migration preserves existing agents, conversations, and configuration.

## AT-14: Global functionality

Given existing global agents and channels, they remain functional after enabling project management.

## AT-15: Remote host context

Given identical directory paths on two hosts, the selected repository executes only on its associated host.

## AT-16: Missing directory

Given a registered repository whose directory is missing, execution fails explicitly rather than using a fallback directory.

## AT-17: Protected action

Given an unapproved destructive Git action, the system prevents execution.

## AT-18: Cross-project memory

Given unrelated projects, project-scoped context retrieval does not include unrelated project memory without explicit authorization.

## AT-19: GitHub issue synchronization

Given an already imported issue, repeated synchronization does not create duplicate tasks.

## AT-20: Upstream regression

Given the established baseline, fork changes introduce no unexplained core functionality regressions.

## AT-21: Application build

The application builds successfully using the documented environment and dependency versions.

## AT-22: Feature flag rollback

Disabling incomplete project features does not delete existing project or upstream data.

---

# 21. CI/CD REQUIREMENTS

## 21.1 Continuous integration

Reuse upstream CI wherever practical.

Add relevant checks:

- Dependency installation with lockfile.
- Type checking.
- Linting.
- Unit tests.
- Integration tests.
- Database migration tests.
- Application build.
- Security validation.

## 21.2 Development build

Provide reproducible Linux development build instructions.

Do not guess installation commands.

Discover them from the actual repository.

## 21.3 Pull request requirements

Every pull request should include:

- Summary.
- Related phase.
- Related requirement IDs.
- Changed files.
- Test results.
- Screenshots or recordings for UI changes where practical.
- Migration impact.
- Security impact.
- Upstream compatibility impact.
- Known limitations.
- Rollback considerations.

## 21.4 Release requirements

- Versioned release.
- Changelog.
- Build artifacts.
- Documented dependencies.
- Upgrade instructions.
- License compliance.
- Verified updater configuration.
- Artifact integrity verification.
- No unauthorized publishing to upstream infrastructure.

---

# 22. DOCUMENTATION STRUCTURE

Maintain project documentation.

Suggested structure:

```text
docs/
  PRD.md
  ROADMAP.md
  IMPLEMENTATION_PLAN.md
  UPSTREAM_AUDIT.md
  FEATURE_INVENTORY.md
  LICENSE_AUDIT.md
  SECURITY_AUDIT.md
  DATABASE_AUDIT.md
  AGENT_RUNTIME_AUDIT.md
  ARCHITECTURE_CURRENT.md
  ARCHITECTURE_PROPOSED.md
  UPSTREAM_SYNC_STRATEGY.md
  ACCEPTANCE_TESTS.md
  TEST_BASELINE.md
  RISK_REGISTER.md
  DEVELOPMENT_GUIDE.md
  HANDOVER.md
  STATUS.md
  CHANGELOG_FORK.md
  architecture/
    project-domain.md
    repository-context.md
    coding-sessions.md
    worktree-manager.md
    task-management.md
    provider-integration.md
    permission-model.md
  adr/
    0001-project-centric-architecture.md
    0002-upstream-preserving-fork.md
    0003-repository-execution-context.md
    0004-worktree-isolation.md
```

Adapt filenames to existing repository conventions.

Avoid replacing upstream documentation unnecessarily.

---

# 23. AI AGENT COLLABORATION RULES

## 23.1 Persistent development instructions

Create or extend AGENTS.md using existing repository conventions.

If CLAUDE.md exists, preserve it and avoid conflicting duplicate instructions.

The instructions must define:

- Project goal.
- Architecture boundaries.
- Upstream preservation strategy.
- Approved development commands.
- Test requirements.
- Git conventions.
- Migration rules.
- Security rules.
- Documentation requirements.
- Human approval requirements.
- Handover format.

## 23.2 Responsibilities

### Architect Agent

- Audit architecture.
- Produce ADRs.
- Identify integration boundaries.
- Review technical designs.

### Developer Agent

- Implement approved requirements.
- Add tests.
- Record limitations.
- Update documentation.

### Reviewer Agent

- Inspect implementation.
- Verify acceptance criteria.
- Identify regressions.
- Review architecture and security.

### QA Agent

- Run tests.
- Reproduce bugs.
- Verify real workflows.
- Record test evidence.

### DevOps Agent

- Maintain build and CI configuration.
- Verify release artifacts.
- Document deployment and recovery.

These roles can be fulfilled by Claude Code, Codex, or another authorized provider.

## 23.3 Multi-agent collaboration

- Assign clear file and module ownership.
- Use separate branches or worktrees for overlapping tasks.
- Coordinate schema changes.
- Avoid concurrent modifications to the same migration files.
- Do not overwrite another agent's work.
- Record cross-agent dependencies.
- Resolve conflicting architectural decisions before implementation.

## 23.4 Agent context handover

Before ending an implementation session, update the handover document.

Required fields:

- Current phase.
- Current branch.
- Upstream base commit.
- Last implementation commit.
- Completed requirements.
- Incomplete requirements.
- Changed files.
- Architectural decisions.
- Tests executed.
- Test results.
- Build results.
- Known failures.
- Blockers.
- Next recommended task.
- Human approval requirements.

This must allow another AI coding agent to continue without relying solely on previous chat history.

---

# 24. DEVELOPMENT PROGRESS REPORT FORMAT

At the end of every milestone, report:

## Milestone

Phase and requirement identifiers.

## Implementation

What was implemented.

## Architecture

Which existing modules were reused or extended.

## Git state

- Repository.
- Branch.
- Commit.
- Worktree.
- Pull request URL if created.

## Validation

- Tests executed.
- Passed tests.
- Failed tests.
- Skipped tests.
- Build results.
- Manual smoke tests.
- Screenshots or logs where appropriate.

## Compatibility

- Existing functionality preserved.
- Migration impact.
- Upstream files modified.

## Security

- Permission changes.
- Protected actions.
- New dependencies.
- Credential handling.

## Blockers

Explain actual blockers.

Never fabricate successful results.

## Next actions

Describe the next logical implementation steps.

---

# 25. RISKS AND MITIGATIONS

## Risk 1: Frequent upstream changes

Mitigation:

- Additive modules.
- Small integration boundaries.
- Frequent upstream review.
- Documented synchronization process.

## Risk 2: License restrictions

Mitigation:

- Verify selected commit license.
- Obtain appropriate authorization before commercial use.
- Preserve attribution.

## Risk 3: Incorrect agent working directory

Mitigation:

- Runtime-enforced context.
- Canonical path validation.
- Execution preflight.
- Provider smoke tests.

## Risk 4: Cross-project context leakage

Mitigation:

- Explicit scope filtering.
- Immutable execution context.
- Permission checks.
- Dedicated context isolation tests.

## Risk 5: Concurrent code modification

Mitigation:

- Git worktrees.
- Operation locks.
- Separate task ownership.
- Protected cleanup.

## Risk 6: Database migration failure

Mitigation:

- Versioned migrations.
- Backups.
- Migration tests.
- Documented recovery.

## Risk 7: Provider API changes

Mitigation:

- Reuse upstream adapters.
- Isolate provider-specific code.
- Capability detection.
- Integration tests.

## Risk 8: Accidental destruction of source files

Mitigation:

- Read-only defaults where appropriate.
- Explicit approvals.
- Safe path validation.
- No automatic dirty-worktree cleanup.

## Risk 9: Excessive product scope

Mitigation:

- Strict MVP.
- Feature flags.
- Phase-based delivery.
- Avoid IDE replacement.

## Risk 10: Dependency on external cloud services

Mitigation:

- Audit dependencies.
- Document required connectivity.
- Avoid introducing unnecessary cloud requirements.
- Do not bypass official service restrictions.

## Risk 11: False task completion

Mitigation:

- Evidence-based completion policy.
- Test validation.
- Reviewer verification.
- Explicit blockers.

---

# 26. OUT OF SCOPE

The following are excluded unless approved in a future product revision:

- Full IDE implementation.
- Custom AI model training.
- Rebuilding Claude Code.
- Rebuilding Codex.
- Replacing the upstream server architecture.
- Building a complete GitHub replacement.
- Building a commercial SaaS platform.
- Removing upstream authentication.
- Bypassing upstream licensing.
- Replacing all upstream UI components.
- Rewriting the application into a different framework.
- Implementing all possible provider integrations.
- Fully autonomous production deployments without human approval.

---

# 27. DEFINITION OF DONE

A requirement is complete only when:

1. Implementation exists in the codebase.
2. Relevant requirements are traceable.
3. Acceptance criteria are satisfied.
4. Automated tests are added where appropriate.
5. Relevant existing tests pass or pre-existing failures are documented.
6. Application build succeeds.
7. Security requirements are met.
8. Data migration is verified when applicable.
9. Documentation is updated.
10. Known limitations are disclosed.
11. Upstream compatibility impact is documented.
12. Changes are committed to an appropriate branch.
13. Review requirements are satisfied.

A milestone is complete only when all mandatory requirements for that milestone meet this definition.

---

# 28. PRIORITY SUMMARY

## P0 — MVP essential

- Project management.
- Repository management.
- Repository execution context.
- Persistent coding sessions.
- Claude Code and Codex integration.
- Basic agent scope associations.
- Basic project dashboard.
- Data persistence.
- Context isolation.
- Backward compatibility.

## P1 — Development productivity

- Project channels.
- Project knowledge.
- Git worktree manager.
- Development tasks.
- Agent monitoring.
- Host-aware context.
- Parallel development.

## P2 — Advanced engineering management

- Git diff viewer.
- GitHub issues.
- Pull request integration.
- CI status.
- File explorer.
- Autonomous coding workflows.
- Advanced dashboard.

## P3 — Ecosystem coordination

- Cross-repository orchestration.
- Advanced workspace management.
- Remote resource monitoring.
- Coordinated multi-repository releases.
- Cross-platform feature parity.

---

# 29. REFERENCE USE CASE

Workspace: BharataCorp

Project: Mabar Ecosystem

Repositories:

- Mabar Desktop.
- Mabar Backend.
- Mabar Web.
- Flow Automation.

Project-level agents:

- Tech Lead.
- Project Coordinator.
- Reviewer.

Repository-level coding agents:

- Claude Code.
- Codex.
- QA Engineer.

Example feature:

Implement an improved video rendering workflow.

Execution:

1. Human creates project-level task.
2. Tech Lead analyzes requirements.
3. Tech Lead identifies affected repositories.
4. Repository-specific subtasks are created.
5. Isolated worktrees are created.
6. Codex implements backend changes.
7. Claude Code implements desktop integration.
8. QA agent runs tests.
9. Reviewer inspects diffs.
10. Review findings are resolved.
11. Pull requests are created.
12. Human approves merge sequence.
13. Project dashboard displays completed work.
14. Task and session history remain accessible.

The application should enable this workflow without requiring the user to manually organize unrelated agent chats for every repository.

---

# 30. INITIAL EXECUTION ORDER

Upon receiving this PRD, the implementing AI agent must perform the following:

Step 1: Verify the actual upstream repository and current license.

Step 2: Check the current local environment and available tools.

Step 3: Determine whether an authorized fork already exists.

Step 4: Obtain the upstream source code without overwriting existing user work.

Step 5: Record the selected upstream version and commit.

Step 6: Inspect repository instructions, skills, and development documentation.

Step 7: Perform Phase 0 technical audit.

Step 8: Install dependencies using the verified upstream instructions when authorized.

Step 9: Attempt the original upstream development build.

Step 10: Run the upstream test baseline.

Step 11: Identify the smallest safe integration points for project management and repository-aware execution.

Step 12: Produce the required audit documents.

Step 13: Produce a detailed Phase 1 and Phase 2 implementation backlog.

Step 14: Report findings, blockers, architectural decisions, and license status.

Step 15: Stop at the Phase 0 review gate before major product implementation.

Do not start implementing all roadmap phases simultaneously.

Do not remove existing upstream functionality to simplify development.

Do not merely produce a theoretical plan when actual source code and a development environment are available.

Perform the authorized technical audit and verify findings with evidence.

---

# FINAL PRODUCT GOAL

Build a reliable, maintainable, project-centric AI software development workspace powered by the existing OpenBot ecosystem.

The user must be able to manage many repositories, run Claude Code and Codex agents, preserve coding sessions, isolate parallel development, track engineering tasks, review code changes, and coordinate multi-repository development from a single application.

Preserve the existing OpenBot engine wherever possible.

Extend it rather than replacing it.

Prioritize correctness, context isolation, user control, maintainability, and upstream compatibility.

END OF MASTER PRD.