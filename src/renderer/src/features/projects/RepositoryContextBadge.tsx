import type { OpenBotRepository } from "@openbot/contracts/project";
import { FolderGit2, GitBranch, Text } from "@openbot/ui";
import { createEffect, createSignal, Show } from "solid-js";
import { type ProjectPort, projectPort } from "./project-port";

interface RepositoryContext {
  projectName: string;
  repository: OpenBotRepository;
}

async function loadRepositoryContext(port: ProjectPort, threadId: string): Promise<RepositoryContext | null> {
  const scope = await port.threadRepositoryScope.getScope({ threadId });
  if (!scope.projectId || !scope.repositoryId) return null;
  const [project, repositories] = await Promise.all([
    port.projects.getProject({ projectId: scope.projectId }),
    port.repositories.listForProject({ projectId: scope.projectId }),
  ]);
  const repository = repositories.find((candidate) => candidate.id === scope.repositoryId);
  if (!project || !repository) return null;
  return { projectName: project.name, repository };
}

/**
 * PRD FR-04 "context visibility" / 7.4 "persistent repository context bar", reduced to what Phase 2
 * actually has: Project › Repository › Branch. Renders nothing for a thread with no repository
 * scope (every thread that existed before Phase 2, and the overwhelming majority of threads today)
 * — this is additive, not a replacement for anything in `ConversationHeader`.
 */
export function RepositoryContextBadge(props: { threadId: string | null | undefined; port?: () => ProjectPort }) {
  const [context, setContext] = createSignal<RepositoryContext | null>(null);
  const port = () => (props.port ?? projectPort)();

  createEffect(
    () => props.threadId ?? null,
    (threadId) => {
      if (!threadId) {
        setContext(null);
        return;
      }
      let cancelled = false;
      void loadRepositoryContext(port(), threadId).then((result) => {
        if (!cancelled) setContext(result);
      });
      return () => {
        cancelled = true;
      };
    },
  );

  return (
    <Show when={context()}>
      {(data) => (
        <div class="repository-context-badge">
          <FolderGit2 aria-hidden="true" />
          <Text as="span" variant="caption" tone="muted">
            {data().projectName}
          </Text>
          <span aria-hidden="true" class="repository-context-badge-separator">
            ›
          </span>
          <Text as="span" variant="caption" tone="muted">
            {data().repository.name}
          </Text>
          <Show when={data().repository.currentBranch}>
            {(branch) => (
              <span class="repository-context-badge-branch">
                <GitBranch aria-hidden="true" />
                <Text as="span" variant="caption" tone="muted">
                  {branch()}
                </Text>
              </span>
            )}
          </Show>
        </div>
      )}
    </Show>
  );
}
