import { Alert, AlertDescription, Button, Dialog, Field, IconButton, Input, Textarea, X } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createEffect, createStore, Show } from "solid-js";
import { useProjects } from "./project-context";

export function EditProjectDialog() {
  const projects = useProjects();
  const { t } = useText();
  const [draft, setDraft] = createStore<{ name: string; description: string }>({
    name: "",
    description: "",
  });

  const activeProject = () => projects.state.projects.find((project) => project.id === projects.state.activeProjectId);

  createEffect(
    () => ({ open: projects.state.editOpen, project: activeProject() }),
    ({ open, project }) => {
      if (!open || !project) return;
      setDraft((state) => {
        state.name = project.name;
        state.description = project.description;
      });
    },
  );

  return (
    <Dialog.Root
      open={projects.state.editOpen}
      onOpenChange={(open) => {
        if (!open) projects.closeEdit();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="project-dialog-backdrop">
          <Dialog.Content class="project-create-dialog">
            <header class="project-dialog-header">
              <Dialog.Title>{t("project.edit.title")}</Dialog.Title>
              <IconButton label={t("project.edit.close")} variant="ghost" onClick={projects.closeEdit}>
                <X />
              </IconButton>
            </header>
            <form
              class="project-create-form"
              onSubmit={(event) => {
                event.preventDefault();
                const project = activeProject();
                if (!project) return;
                void projects.updateProject({
                  projectId: project.id,
                  name: draft.name.trim(),
                  description: draft.description.trim(),
                });
              }}
            >
              <Show when={projects.state.error}>
                {(message) => (
                  <Alert tone="danger" role="alert">
                    <AlertDescription>{message()}</AlertDescription>
                  </Alert>
                )}
              </Show>
              <Field label={t("project.form.name")}>
                <Input
                  size="lg"
                  value={draft.name}
                  placeholder={t("project.form.namePlaceholder")}
                  onValueChange={(name) =>
                    setDraft((state) => {
                      state.name = name;
                    })
                  }
                  required
                />
              </Field>
              <Field label={t("project.form.instructions")}>
                <Textarea
                  value={draft.description}
                  placeholder={t("project.form.instructionsPlaceholder")}
                  onInput={(event) =>
                    setDraft((state) => {
                      state.description = event.currentTarget.value;
                    })
                  }
                />
              </Field>
              <div class="project-dialog-actions">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={projects.state.pending}
                  onClick={() => {
                    const project = activeProject();
                    if (project) void projects.archiveProject(project.id);
                  }}
                >
                  {t("project.action.archive")}
                </Button>
                <Button type="submit" disabled={projects.state.pending || draft.name.trim().length === 0}>
                  {t("project.edit.submit")}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
