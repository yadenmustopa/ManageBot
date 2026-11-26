import { Alert, AlertDescription, Button, Dialog, Text } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { Show } from "solid-js";
import { useProjects } from "./project-context";

export function RemoveWorktreeDialog() {
  const projects = useProjects();
  const { t } = useText();

  return (
    <Dialog.Root
      open={projects.state.dirtyWorktreeToRemove !== null}
      onOpenChange={(open) => {
        if (!open) projects.cancelForceRemoveWorktree();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="project-dialog-backdrop">
          <Dialog.Content class="project-create-dialog">
            <header class="project-dialog-header">
              <Dialog.Title>{t("project.worktree.removeConfirm.title")}</Dialog.Title>
            </header>
            <Show when={projects.state.dirtyWorktreeToRemove}>
              {(worktree) => (
                <Text as="p" variant="body">
                  {worktree().branchName}
                </Text>
              )}
            </Show>
            <Alert tone="danger">
              <AlertDescription>{t("project.worktree.removeConfirm.description")}</AlertDescription>
            </Alert>
            <Show when={projects.state.error}>
              {(message) => (
                <Alert tone="danger" role="alert">
                  <AlertDescription>{message()}</AlertDescription>
                </Alert>
              )}
            </Show>
            <footer class="project-editor-footer">
              <Button variant="ghost" disabled={projects.state.pending} onClick={projects.cancelForceRemoveWorktree}>
                {t("project.worktree.removeConfirm.cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={projects.state.pending}
                onClick={() => void projects.confirmForceRemoveWorktree()}
              >
                {t("project.worktree.removeConfirm.confirm")}
              </Button>
            </footer>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
