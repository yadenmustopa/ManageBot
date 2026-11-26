import { Alert, AlertDescription, Button, Dialog, Field, IconButton, Input, Textarea, X } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createStore, Show } from "solid-js";
import { useProjects } from "./project-context";

export function CreateTaskDialog() {
  const projects = useProjects();
  const { t } = useText();
  const [draft, setDraft] = createStore({ title: "", description: "", acceptanceCriteria: "" });

  function resetDraft() {
    setDraft((state) => {
      state.title = "";
      state.description = "";
      state.acceptanceCriteria = "";
    });
  }

  return (
    <Dialog.Root
      open={projects.state.createTaskOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetDraft();
          projects.closeCreateTask();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="project-dialog-backdrop">
          <Dialog.Content class="project-create-dialog">
            <header class="project-dialog-header">
              <Dialog.Title>{t("project.tasks.create.title")}</Dialog.Title>
              <IconButton
                label={t("project.tasks.create.close")}
                variant="ghost"
                onClick={() => {
                  resetDraft();
                  projects.closeCreateTask();
                }}
              >
                <X />
              </IconButton>
            </header>
            <form
              class="project-create-form"
              onSubmit={(event) => {
                event.preventDefault();
                void projects
                  .createTask({
                    title: draft.title.trim(),
                    description: draft.description.trim(),
                    acceptanceCriteria: draft.acceptanceCriteria.trim(),
                    repositoryId: projects.state.repositories[0]?.id ?? null,
                  })
                  .then((created) => {
                    if (created) resetDraft();
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
              <Field label={t("project.tasks.create.titleField")}>
                <Input
                  size="lg"
                  placeholder={t("project.tasks.create.titlePlaceholder")}
                  required
                  value={draft.title}
                  onValueChange={(title) =>
                    setDraft((state) => {
                      state.title = title;
                    })
                  }
                />
              </Field>
              <Field label={t("project.tasks.create.description")}>
                <Textarea
                  placeholder={t("project.tasks.create.descriptionPlaceholder")}
                  value={draft.description}
                  onInput={(event) =>
                    setDraft((state) => {
                      state.description = event.currentTarget.value;
                    })
                  }
                />
              </Field>
              <Field label={t("project.tasks.create.acceptanceCriteria")}>
                <Textarea
                  placeholder={t("project.tasks.create.acceptanceCriteriaPlaceholder")}
                  value={draft.acceptanceCriteria}
                  onInput={(event) =>
                    setDraft((state) => {
                      state.acceptanceCriteria = event.currentTarget.value;
                    })
                  }
                />
              </Field>
              <footer class="project-editor-footer">
                <Button type="submit" disabled={projects.state.pending || !draft.title.trim()}>
                  {t("project.tasks.create.submit")}
                </Button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
