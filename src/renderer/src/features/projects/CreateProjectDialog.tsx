import { Alert, AlertDescription, Button, Dialog, Field, IconButton, Input, Textarea, X } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createStore, Show } from "solid-js";
import { useProjects } from "./project-context";

export function CreateProjectDialog() {
  const projects = useProjects();
  const { t } = useText();
  const [draft, setDraft] = createStore({ name: "", description: "" });

  return (
    <Dialog.Root
      open={projects.state.createOpen}
      onOpenChange={(open) => {
        if (!open) projects.closeCreate();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="project-dialog-backdrop">
          <Dialog.Content class="project-create-dialog">
            <header class="project-dialog-header">
              <Dialog.Title>{t("project.create.title")}</Dialog.Title>
              <IconButton label={t("project.create.close")} variant="ghost" onClick={projects.closeCreate}>
                <X />
              </IconButton>
            </header>
            <form
              class="project-create-form"
              onSubmit={(event) => {
                event.preventDefault();
                void projects.createProject({ name: draft.name.trim(), description: draft.description.trim() });
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
                  placeholder={t("project.form.namePlaceholder")}
                  required
                  value={draft.name}
                  onValueChange={(name) =>
                    setDraft((state) => {
                      state.name = name;
                    })
                  }
                />
              </Field>
              <Field label={t("project.form.description")}>
                <Textarea
                  placeholder={t("project.form.descriptionPlaceholder")}
                  value={draft.description}
                  onInput={(event) =>
                    setDraft((state) => {
                      state.description = event.currentTarget.value;
                    })
                  }
                />
              </Field>
              <footer class="project-editor-footer">
                <Button type="submit" disabled={projects.state.pending || !draft.name.trim()}>
                  {t("common.create")}
                </Button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
