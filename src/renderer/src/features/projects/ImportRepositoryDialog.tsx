import { Alert, AlertDescription, Button, Dialog, Field, IconButton, Input, X } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createSignal, Show } from "solid-js";
import { useProjects } from "./project-context";

export function ImportRepositoryDialog() {
  const projects = useProjects();
  const { t } = useText();
  const [path, setPath] = createSignal("");

  return (
    <Dialog.Root
      open={projects.state.importOpen}
      onOpenChange={(open) => {
        if (!open) projects.closeImport();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="project-dialog-backdrop">
          <Dialog.Content class="project-import-dialog">
            <header class="project-dialog-header">
              <Dialog.Title>{t("project.import.title")}</Dialog.Title>
              <IconButton label={t("project.import.close")} variant="ghost" onClick={projects.closeImport}>
                <X />
              </IconButton>
            </header>
            <form
              class="project-import-form"
              onSubmit={(event) => {
                event.preventDefault();
                void projects.importRepository(path().trim());
              }}
            >
              <Show when={projects.state.error}>
                {(message) => (
                  <Alert tone="danger" role="alert">
                    <AlertDescription>{message()}</AlertDescription>
                  </Alert>
                )}
              </Show>
              <Field label={t("project.import.path")} description={t("project.import.pathHint")}>
                <div class="project-import-path-row">
                  <Input
                    size="lg"
                    placeholder={t("project.import.pathPlaceholder")}
                    required
                    value={path()}
                    onValueChange={setPath}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={projects.state.pending}
                    onClick={() => {
                      void projects.chooseRepositoryFolder().then((selected) => {
                        if (selected) setPath(selected);
                      });
                    }}
                  >
                    {t("project.import.chooseFolder")}
                  </Button>
                </div>
              </Field>
              <footer class="project-editor-footer">
                <Button type="submit" disabled={projects.state.pending || !path().trim()}>
                  {t("project.import.submit")}
                </Button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
