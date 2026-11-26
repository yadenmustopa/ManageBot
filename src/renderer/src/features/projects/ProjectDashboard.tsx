import type { DevelopmentTaskStatus, RepositoryHealth, WorktreeLifecycleStatus } from "@openbot/contracts/project";
import {
  Badge,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
  Trash2,
  X,
} from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createSignal, For, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { useChannels } from "../channels/channels-context";
import { useWindowPage } from "../window/window-page-context";
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

function isGitRepository(repository: {
  dirty: boolean | null;
  currentBranch: string | null;
  remoteUrl: string | null;
}): boolean {
  return repository.dirty !== null || repository.currentBranch !== null || repository.remoteUrl !== null;
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

function taskStatusLabel(t: ReturnType<typeof useText>["t"], status: DevelopmentTaskStatus): string {
  switch (status) {
    case "backlog":
      return t("project.tasks.status.backlog");
    case "ready":
      return t("project.tasks.status.ready");
    case "planning":
      return t("project.tasks.status.planning");
    case "in-progress":
      return t("project.tasks.status.in-progress");
    case "testing":
      return t("project.tasks.status.testing");
    case "in-review":
      return t("project.tasks.status.in-review");
    case "changes-requested":
      return t("project.tasks.status.changes-requested");
    case "blocked":
      return t("project.tasks.status.blocked");
    case "ready-to-merge":
      return t("project.tasks.status.ready-to-merge");
    case "done":
      return t("project.tasks.status.done");
    case "cancelled":
      return t("project.tasks.status.cancelled");
  }
}

export function ProjectDashboard() {
  const projects = useProjects();
  const agents = useAgents();
  const channels = useChannels();
  const windowPage = useWindowPage();
  const { t } = useText();
  const [selectedChannelId, setSelectedChannelId] = createSignal("");
  const activeProject = () => projects.state.projects.find((project) => project.id === projects.state.activeProjectId);
  const availableChannels = () => {
    const attached = new Set(projects.state.channels.map((link) => link.channelId));
    return channels.state.channels.filter((channel) => !channel.archived && !attached.has(channel.id));
  };
  const channelById = (channelId: string) => channels.state.channels.find((candidate) => candidate.id === channelId);

  function openProjectChannel(channelId: string) {
    void channels.open(channelId);
    windowPage.showAgents();
  }

  function startCodingSession(projectId: string, repositoryId: string, worktreeId: string | null = null) {
    projects.requestRepositorySession(projectId, repositoryId, worktreeId);
    agents.openAgentSetup();
  }

  function startProjectSession(projectId: string) {
    const firstRepository = projects.state.repositories[0];
    if (firstRepository) {
      startCodingSession(projectId, firstRepository.id);
      return;
    }
    agents.openAgentSetup();
  }

  function openProjectSession(agentId: string) {
    agents.cancelAgentSetup();
    agents.setActiveAgentId(agentId);
    agents.setExplicitlyOpenedAgentChatId(agentId);
    agents.setAgentChatOpenRevision((revision) => revision + 1);
    windowPage.showAgents();
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
              <div class="project-dashboard-header-actions">
                <Button variant="outline" onClick={projects.openEdit}>
                  {t("project.action.edit")}
                </Button>
                <Button onClick={projects.openImport}>{t("project.dashboard.importRepository")}</Button>
              </div>
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
              <div class="project-dashboard-metric">
                <Heading as="h2" size="md" class="project-dashboard-metric-value">
                  {projects.state.tasks.length}
                </Heading>
                <Text as="span" variant="caption" tone="muted" class="project-dashboard-metric-label">
                  {t("project.tasks.title")}
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
                            <Show when={isGitRepository(repository)}>
                              <Button variant="ghost" onClick={() => void projects.openReview(repository.id)}>
                                {t("project.review.open")}
                              </Button>
                              <IconButton
                                label={t("project.worktree.new")}
                                variant="ghost"
                                onClick={() => projects.openCreateWorktree(repository.id)}
                              >
                                <Plus />
                              </IconButton>
                            </Show>
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
                                    <Button
                                      variant="ghost"
                                      onClick={() => void projects.openReview(repository.id, worktree.id)}
                                    >
                                      {t("project.review.open")}
                                    </Button>
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
            <section class="project-tasks-section">
              <header class="project-tasks-header">
                <Heading as="h2" size="md">
                  {t("project.channels.title")}
                </Heading>
                <Show when={availableChannels().length > 0}>
                  <div class="project-channel-picker">
                    <Select<string>
                      options={availableChannels().map((channel) => channel.id)}
                      value={selectedChannelId()}
                      onChange={(value) => setSelectedChannelId(value ?? "")}
                      placeholder={t("project.channels.selectPlaceholder")}
                      itemComponent={(item) => (
                        <SelectItem item={item.item}>
                          #{channelById(item.item.rawValue)?.name ?? item.item.rawValue}
                        </SelectItem>
                      )}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue<string>>
                          {(state) => {
                            const id = state.selectedOption();
                            return id ? `#${channelById(id)?.name ?? id}` : t("project.channels.selectPlaceholder");
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent />
                    </Select>
                    <Button
                      variant="outline"
                      disabled={!selectedChannelId()}
                      onClick={() => {
                        const channelId = selectedChannelId();
                        if (!channelId) return;
                        void projects.attachChannel(channelId);
                        setSelectedChannelId("");
                      }}
                    >
                      {t("project.channels.connect")}
                    </Button>
                  </div>
                </Show>
              </header>
              <ItemGroup class="project-task-list">
                <Show
                  when={projects.state.channels.length > 0}
                  fallback={<p class="project-dashboard-empty">{t("project.channels.empty")}</p>}
                >
                  <For each={projects.state.channels}>
                    {(link) => {
                      const channel = () => channelById(link.channelId);
                      return (
                        <Item class="project-task-item">
                          <ItemContent>
                            <ItemTitle>#{channel()?.name ?? link.channelId}</ItemTitle>
                            <Show when={link.isDefault}>
                              <Badge variant="ghost">{t("project.channels.default")}</Badge>
                            </Show>
                          </ItemContent>
                          <ItemActions>
                            <Show when={!link.isDefault}>
                              <Button variant="ghost" onClick={() => void projects.setDefaultChannel(link.channelId)}>
                                {t("project.channels.setDefault")}
                              </Button>
                            </Show>
                            <Button variant="ghost" onClick={() => openProjectChannel(link.channelId)}>
                              {t("project.channels.open")}
                            </Button>
                            <IconButton
                              label={t("project.channels.remove")}
                              variant="ghost"
                              onClick={() => void projects.detachChannel(link.channelId)}
                            >
                              <X />
                            </IconButton>
                          </ItemActions>
                        </Item>
                      );
                    }}
                  </For>
                </Show>
              </ItemGroup>
            </section>
            <section class="project-tasks-section">
              <header class="project-tasks-header">
                <Heading as="h2" size="md">
                  {t("project.sessions.title")}
                </Heading>
                <Button variant="outline" onClick={() => startProjectSession(project().id)}>
                  {t("project.sessions.new")}
                </Button>
              </header>
              <ItemGroup class="project-task-list">
                <Show
                  when={projects.state.sessions.length > 0}
                  fallback={<p class="project-dashboard-empty">{t("project.sessions.empty")}</p>}
                >
                  <For each={projects.state.sessions}>
                    {(session) => (
                      <Item class="project-task-item">
                        <ItemContent>
                          <ItemTitle>{session.title || session.agentName}</ItemTitle>
                          <ItemDescription>{session.agentName}</ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Button variant="ghost" onClick={() => openProjectSession(session.agentId)}>
                            {t("project.sessions.open")}
                          </Button>
                        </ItemActions>
                      </Item>
                    )}
                  </For>
                </Show>
              </ItemGroup>
            </section>
            <section class="project-tasks-section">
              <header class="project-tasks-header">
                <Heading as="h2" size="md">
                  {t("project.tasks.title")}
                </Heading>
                <Button variant="outline" onClick={projects.openCreateTask}>
                  {t("project.tasks.new")}
                </Button>
              </header>
              <ItemGroup class="project-task-list">
                <Show
                  when={projects.state.tasks.length > 0}
                  fallback={<p class="project-dashboard-empty">{t("project.tasks.empty")}</p>}
                >
                  <For each={projects.state.tasks}>
                    {(task) => (
                      <Item class="project-task-item">
                        <ItemContent>
                          <ItemTitle>{task.title}</ItemTitle>
                          <Show when={task.description}>
                            <ItemDescription>{task.description}</ItemDescription>
                          </Show>
                          <ItemDescription class="project-repository-meta">
                            <span>{task.priority.toUpperCase()}</span>
                            <span>{taskStatusLabel(t, task.status)}</span>
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Show when={task.repositoryId}>
                            {(repoId) => (
                              <IconButton
                                label={t("project.tasks.action.startSession")}
                                variant="ghost"
                                onClick={() => startCodingSession(project().id, repoId(), task.worktreeId)}
                              >
                                <MessageSquare />
                              </IconButton>
                            )}
                          </Show>
                          <IconButton
                            label={t("project.tasks.action.archive")}
                            variant="ghost"
                            onClick={() => void projects.archiveTask(task.id)}
                          >
                            <Trash2 />
                          </IconButton>
                        </ItemActions>
                      </Item>
                    )}
                  </For>
                </Show>
              </ItemGroup>
            </section>
          </>
        )}
      </Show>
    </section>
  );
}
