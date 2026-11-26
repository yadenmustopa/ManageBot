import { Alert, AlertDescription, Button, Dialog, Heading, IconButton, Text, X } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { For, Show } from "solid-js";
import { useProjects } from "./project-context";

export function GitReviewDialog() {
  const projects = useProjects();
  const { t } = useText();

  return (
    <Dialog.Root
      open={projects.state.reviewTarget !== null}
      onOpenChange={(open) => {
        if (!open) projects.closeReview();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="project-dialog-backdrop">
          <Dialog.Content class="project-review-dialog">
            <header class="project-dialog-header">
              <Dialog.Title>{t("project.review.title")}</Dialog.Title>
              <IconButton label={t("project.review.close")} variant="ghost" onClick={projects.closeReview}>
                <X />
              </IconButton>
            </header>
            <Show when={projects.state.reviewSnapshot}>
              {(snapshot) => (
                <div class="project-review-body">
                  <Show when={snapshot().hasConflicts}>
                    <Alert tone="danger">
                      <AlertDescription>{t("project.review.conflicts")}</AlertDescription>
                    </Alert>
                  </Show>
                  <Show
                    when={snapshot().files.length > 0}
                    fallback={
                      <Text as="p" variant="body" tone="muted">
                        {t("project.review.clean")}
                      </Text>
                    }
                  >
                    <div class="project-review-files">
                      <For each={snapshot().files}>
                        {(file) => (
                          <Button
                            variant="ghost"
                            onClick={() => void projects.selectReviewFile(file.path, file.staged)}
                          >
                            {file.status}: {file.path}
                          </Button>
                        )}
                      </For>
                    </div>
                  </Show>
                  <Show when={projects.state.reviewDiff}>
                    {(diff) => (
                      <div class="project-review-diff-wrap">
                        <Show when={diff().truncated}>
                          <Text as="p" variant="caption" tone="muted">
                            {t("project.review.diffTruncated")}
                          </Text>
                        </Show>
                        <Show when={diff().binary}>
                          <Text as="p" variant="caption" tone="muted">
                            {t("project.review.diffBinary")}
                          </Text>
                        </Show>
                        <Show when={diff().diff}>
                          <pre class="project-review-diff">{diff().diff}</pre>
                        </Show>
                      </div>
                    )}
                  </Show>
                  <Show when={snapshot().commits.length > 0}>
                    <div class="project-review-commits">
                      <Heading as="h3" size="sm">
                        {t("project.review.commits")}
                      </Heading>
                      <For each={snapshot().commits.slice(0, 5)}>
                        {(commit) => (
                          <Text as="p" variant="caption" tone="muted">
                            {commit.shortHash} {commit.subject}
                          </Text>
                        )}
                      </For>
                    </div>
                  </Show>
                  <Show when={projects.state.reviewGitHub?.owner}>
                    <div class="project-review-github">
                      <Heading as="h3" size="sm">
                        {t("project.review.github")} ({projects.state.reviewGitHub?.owner}/
                        {projects.state.reviewGitHub?.repo})
                      </Heading>
                      <Text as="p" variant="caption" tone="muted">
                        {t("project.review.issues")}: {projects.state.reviewGitHub?.issues.length ?? 0} ·{" "}
                        {t("project.review.pullRequests")}: {projects.state.reviewGitHub?.pullRequests.length ?? 0}
                      </Text>
                    </div>
                  </Show>
                </div>
              )}
            </Show>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
