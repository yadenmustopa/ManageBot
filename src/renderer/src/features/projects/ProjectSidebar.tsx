import { Button, FolderKanban, IconButton, Item, ItemContent, ItemGroup, ItemTitle, Plus } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { For, Show } from "solid-js";
import { useProjects } from "./project-context";

export function ProjectSidebar() {
  const projects = useProjects();
  const { t } = useText();

  return (
    <nav class="project-sidebar" aria-label={t("project.sidebar.label")}>
      <header class="project-sidebar-header">
        <h2>{t("project.sidebar.title")}</h2>
        <IconButton label={t("project.sidebar.new")} variant="ghost" onClick={projects.openCreate}>
          <Plus />
        </IconButton>
      </header>
      <ItemGroup class="project-sidebar-list">
        <Show
          when={projects.state.projects.length > 0}
          fallback={<p class="project-sidebar-empty">{t("project.sidebar.empty")}</p>}
        >
          <For each={projects.state.projects}>
            {(project) => (
              <Item
                class="project-sidebar-item"
                data-active={project.id === projects.state.activeProjectId ? "" : undefined}
              >
                <Button
                  variant="ghost"
                  fullWidth
                  class="project-sidebar-item-button"
                  onClick={() => projects.selectProject(project.id)}
                  aria-current={project.id === projects.state.activeProjectId ? "true" : undefined}
                >
                  <FolderKanban aria-hidden="true" />
                  <ItemContent>
                    <ItemTitle>{project.name}</ItemTitle>
                  </ItemContent>
                </Button>
              </Item>
            )}
          </For>
        </Show>
      </ItemGroup>
    </nav>
  );
}
