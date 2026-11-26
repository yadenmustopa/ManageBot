import type { RepositoryHealth, WorktreeLifecycleStatus } from "@openbot/contracts/project";
import {
  Button,
  FolderGit2,
  GitBranch,
  Heading,
  IconButton,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  MessageSquare,
  Plus,
  RefreshCw,
  Text,
  Trash2,
  X,
} from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { For, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { useProjects } from "./project-context";

function healthLabel(t: ReturnType<typeof useText>["t"], health: RepositoryHealth): string {
  switch (health) {
    case "available":
      return t("project.repository.health.available");
    case "missing":
      return t("project.repository.health.missing");
    case "dirty":
      return t("project.repository.health.dirty");
    case "detached-head":
      return t("project.repository.health.detached-head");
    case "invalid":
      return t("project.repository.health.invalid");
  }
}

function worktreeStatusLabel(t: ReturnType<typeof useText>["t"], status: WorktreeLifecycleStatus): string {
  switch (status) {
    case "active":
      return t("project.worktree.status.active");
    case "stale":
      return t("project.worktree.status.stale");
    case "archived":
      return t("project.worktree.status.archived");
  }
}

export function ProjectDashboard() {
  const projects = useProjects();
  const agents = useAgents();
  const { t } = useText();
  const activeProject = () => projects.state.projects.find((project) => project.id === projects.state.activeProjectId);

  function startCodingSession(projectId: string, repositoryId: string, worktreeId: string | null = null) {
    projects.requestRepositorySession(projectId, repositoryId, worktreeId);
    agents.openAgentSetup();
  }

  return (
    <section class="project-dashboard" aria-label={t("project.dashboard.label")}>
      <Show when={activeProject()} fallback={<p class="project-dashboard-empty">{t("project.dashboard.noProject")}</p>}>
        {(project) => (
          <>
            <header class="project-dashboard-header">
              <div>
                <Heading as="h1" size="lg">
                  {project().name}
                </Heading>
                <Show when={project().description}>
                  <p class="project-dashboard-description">{project().description}</p>
                </Show>
              </div>
              <Button onClick={projects.openImport}>{t("project.dashboard.importRepository")}</Button>
            </header>
            <div class="project-dashboard-metrics">
              <div class="project-dashboard-metric">
                <Heading as="h2" size="md" class="project-dashboard-metric-value">
                  {projects.state.dashboard?.repositoryCount ?? 0}
                </Heading>
                <Text as="span" variant="caption" tone="muted" class="project-dashboard-metric-label">
                  {t("project.dashboard.repositories")}
                </Text>
              </div>
            </div>
            <ItemGroup class="project-repository-list">
              <Show
                when={projects.state.repositories.length > 0}
                fallback={<p class="project-dashboard-empty">{t("project.dashboard.noRepositories")}</p>}
              >
                <For each={projects.state.repositories}>
                  {(repository) => {
                    const worktrees = () => projects.state.worktreesByRepository[repository.id] ?? [];
                    return (
                      <div class="project-repository-group">
                        <Item class="project-repository-item">
                          <FolderGit2 aria-hidden="true" />
                          <ItemContent>
                            <ItemTitle>{repository.name}</ItemTitle>
                            <ItemDescription>{repository.canonicalPath}</ItemDescription>
                            <ItemDescription class="project-repository-meta">
                              <Show when={repository.currentBranch}>
                                {(branch) => (
                                  <span class="project-repository-branch">
                                    <GitBranch aria-hidden="true" />
                                    {branch()}
                                  </span>
                                )}
                              </Show>
                              <span data-health={repository.health}>{healthLabel(t, repository.health)}</span>
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <IconButton
                              label={t("project.worktree.new")}
                              variant="ghost"
                              onClick={() => projects.openCreateWorktree(repository.id)}
                            >
                              <Plus />
                            </IconButton>
                            <IconButton
                              label={t("project.repository.newSession")}
                              variant="ghost"
                              onClick={() => startCodingSession(project().id, repository.id)}
                            >
                              <MessageSquare />
                            </IconButton>
                            <IconButton
                              label={t("project.repository.refresh")}
                              variant="ghost"
                              onClick={() => void projects.refreshRepository(repository.id)}
                            >
                              <RefreshCw />
                            </IconButton>
                            <IconButton
                              label={t("project.repository.remove")}
                              variant="ghost"
                              onClick={() => void projects.detachRepository(repository.id)}
                            >
                              <X />
                            </IconButton>
                          </ItemActions>
                        </Item>
                        <Show when={worktrees().length > 0}>
                          <ItemGroup class="project-worktree-list">
                            <For each={worktrees()}>
                              {(worktree) => (
                                <Item class="project-worktree-item">
                                  <GitBranch aria-hidden="true" />
                                  <ItemContent>
                                    <ItemTitle>{worktree.branchName}</ItemTitle>
                                    <ItemDescription>{worktree.canonicalPath}</ItemDescription>
                                    <ItemDescription class="project-repository-meta">
                                      <span data-worktree-status={worktree.lifecycleStatus}>
                                        {worktreeStatusLabel(t, worktree.lifecycleStatus)}
                                      </span>
                                    </ItemDescription>
                                  </ItemContent>
                                  <ItemActions>
                                    <IconButton
                                      label={t("project.worktree.newSession")}
                                      variant="ghost"
                                      onClick={() => startCodingSession(project().id, repository.id, worktree.id)}
                                    >
                                      <MessageSquare />
                                    </IconButton>
                                    <IconButton
                                      label={t("project.worktree.refresh")}
                                      variant="ghost"
                                      onClick={() => void projects.refreshWorktree(worktree.id)}
                                    >
                                      <RefreshCw />
                                    </IconButton>
                                    <IconButton
                                      label={t("project.worktree.remove")}
                                      variant="ghost"
                                      onClick={() => void projects.removeWorktree(worktree)}
                                    >
                                      <Trash2 />
                                    </IconButton>
                                  </ItemActions>
                                </Item>
                              )}
                            </For>
                          </ItemGroup>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </Show>
            </ItemGroup>
          </>
        )}
      </Show>
    </section>
  );
}
