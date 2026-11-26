import { Alert, AlertDescription, Button, Dialog, Field, IconButton, Input, X } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createStore, Show } from "solid-js";
import { useProjects } from "./project-context";

export function CreateWorktreeDialog() {
  const projects = useProjects();
  const { t } = useText();
  const [draft, setDraft] = createStore({ branchName: "", baseRef: "" });

  function resetDraft() {
    setDraft((state) => {
      state.branchName = "";
      state.baseRef = "";
    });
  }

  return (
    <Dialog.Root
      open={projects.state.createWorktreeRepositoryId !== null}
      onOpenChange={(open) => {
        if (!open) {
          resetDraft();
          projects.closeCreateWorktree();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="project-dialog-backdrop">
          <Dialog.Content class="project-create-dialog">
            <header class="project-dialog-header">
              <Dialog.Title>{t("project.worktree.create.title")}</Dialog.Title>
              <IconButton
                label={t("project.worktree.create.close")}
                variant="ghost"
                onClick={() => {
                  resetDraft();
                  projects.closeCreateWorktree();
                }}
              >
                <X />
              </IconButton>
            </header>
            <form
              class="project-create-form"
              onSubmit={(event) => {
                event.preventDefault();
                const repositoryId = projects.state.createWorktreeRepositoryId;
                if (!repositoryId) return;
                const baseRef = draft.baseRef.trim();
                void projects
                  .createWorktree({
                    repositoryId,
                    branchName: draft.branchName.trim(),
                    baseRef: baseRef.length > 0 ? baseRef : null,
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
              <Field label={t("project.worktree.create.branch")}>
                <Input
                  size="lg"
                  placeholder={t("project.worktree.create.branchPlaceholder")}
                  required
                  value={draft.branchName}
                  onValueChange={(branchName) =>
                    setDraft((state) => {
                      state.branchName = branchName;
                    })
                  }
                />
              </Field>
              <Field label={t("project.worktree.create.baseRef")}>
                <Input
                  size="lg"
                  placeholder={t("project.worktree.create.baseRefPlaceholder")}
                  value={draft.baseRef}
                  onValueChange={(baseRef) =>
                    setDraft((state) => {
                      state.baseRef = baseRef;
                    })
                  }
                />
              </Field>
              <footer class="project-editor-footer">
                <Button type="submit" disabled={projects.state.pending || !draft.branchName.trim()}>
                  {t("project.worktree.create.submit")}
                </Button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
