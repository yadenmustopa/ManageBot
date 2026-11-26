import { Alert, AlertDescription, Button, Dialog, Field, IconButton, Input, Text, Textarea, X } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createStore, For, Show } from "solid-js";
import { useProjects } from "./project-context";

export function CreateProjectDialog() {
  const projects = useProjects();
  const { t } = useText();
  const [draft, setDraft] = createStore<{ name: string; description: string; folders: string[] }>({
    name: "",
    description: "",
    folders: [],
  });

  function resetDraft() {
    setDraft((state) => {
      state.name = "";
      state.description = "";
      state.folders = [];
    });
  }

  return (
    <Dialog.Root
      open={projects.state.createOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetDraft();
          projects.closeCreate();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="project-dialog-backdrop">
          <Dialog.Content class="project-create-dialog">
            <header class="project-dialog-header">
              <Dialog.Title>{t("project.create.title")}</Dialog.Title>
              <IconButton
                label={t("project.create.close")}
                variant="ghost"
                onClick={() => {
                  resetDraft();
                  projects.closeCreate();
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
                  .createProject({
                    name: draft.name.trim(),
                    description: draft.description.trim(),
                    repositoryPaths: draft.folders,
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
              <Field label={t("project.form.folders")} description={t("project.form.foldersHint")}>
                <div class="project-create-folders">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={projects.state.pending}
                    onClick={() => {
                      void projects.chooseRepositoryFolders().then((selected) => {
                        if (selected.length === 0) return;
                        setDraft((state) => {
                          state.folders = [...new Set([...state.folders, ...selected])];
                        });
                      });
                    }}
                  >
                    {t("project.import.chooseFolders")}
                  </Button>
                  <Show when={draft.folders.length > 0}>
                    <ul class="project-create-folder-list">
                      <For each={draft.folders}>
                        {(folder) => (
                          <li class="project-create-folder-item">
                            <Text as="span" variant="caption">
                              {folder}
                            </Text>
                            <IconButton
                              label={t("project.form.removeFolder")}
                              variant="ghost"
                              onClick={() =>
                                setDraft((state) => {
                                  state.folders = state.folders.filter((item) => item !== folder);
                                })
                              }
                            >
                              <X />
                            </IconButton>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </div>
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
