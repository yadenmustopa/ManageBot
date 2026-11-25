import type { RepositoryHealth } from "@openbot/contracts/project";
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
  RefreshCw,
  Text,
  X,
} from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { For, Show } from "solid-js";
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

export function ProjectDashboard() {
  const projects = useProjects();
  const { t } = useText();
  const activeProject = () => projects.state.projects.find((project) => project.id === projects.state.activeProjectId);

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
                  {(repository) => (
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
                  )}
                </For>
              </Show>
            </ItemGroup>
          </>
        )}
      </Show>
    </section>
  );
}
