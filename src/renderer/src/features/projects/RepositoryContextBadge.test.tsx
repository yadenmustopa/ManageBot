import type { OpenBotProject, OpenBotRepository } from "@openbot/contracts/project";
import { render, screen, waitFor } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import type { ProjectPort } from "./project-port";
import { RepositoryContextBadge } from "./RepositoryContextBadge";

const now = new Date().toISOString();

const project: OpenBotProject = {
  id: "project-1",
  workspaceId: "workspace-1",
  name: "Mabar Desktop",
  description: "",
  icon: null,
  color: null,
  pinned: false,
  sortOrder: 0,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
};

const repository: OpenBotRepository = {
  id: "repo-1",
  hostId: "local",
  name: "mabar-desktop",
  canonicalPath: "/home/sam/dev/mabar-desktop",
  remoteUrl: null,
  currentBranch: "feat/timeline",
  defaultBranch: "main",
  dirty: false,
  health: "available",
  lastRefreshedAt: now,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
};

function scopedPort(): ProjectPort {
  return {
    projects: {
      ensureDefaultWorkspace: async () => {
        throw new Error("not used");
      },
      listWorkspaces: async () => [],
      listProjects: async () => [],
      getProject: async () => project,
      createProject: async () => {
        throw new Error("not used");
      },
      updateProject: async () => {
        throw new Error("not used");
      },
      archiveProject: async () => {},
      restoreProject: async () => {},
      getDashboardSummary: async () => ({ projectId: project.id, repositoryCount: 1 }),
    },
    repositories: {
      importRepository: async () => {
        throw new Error("not used");
      },
      listForProject: async () => [repository],
      refreshRepository: async () => repository,
      detachRepository: async () => {},
    },
    threadRepositoryScope: {
      getScope: async ({ threadId }) => ({ threadId, projectId: project.id, repositoryId: repository.id }),
      setScope: async ({ threadId, projectId, repositoryId }) => ({ threadId, projectId, repositoryId }),
    },
  };
}

function unscopedPort(): ProjectPort {
  return {
    ...scopedPort(),
    threadRepositoryScope: {
      getScope: async ({ threadId }) => ({ threadId, projectId: null, repositoryId: null }),
      setScope: async ({ threadId, projectId, repositoryId }) => ({ threadId, projectId, repositoryId }),
    },
  };
}

describe("RepositoryContextBadge", () => {
  it("renders nothing for a thread with no repository scope", async () => {
    render(() => <RepositoryContextBadge threadId="thread-unscoped" port={unscopedPort} />);

    await waitFor(() => expect(screen.queryByText(project.name)).toBeNull());
    expect(screen.queryByText(repository.name)).toBeNull();
  });

  it("renders nothing when there is no thread at all", () => {
    render(() => <RepositoryContextBadge threadId={null} port={scopedPort} />);

    expect(screen.queryByText(project.name)).toBeNull();
  });

  it("shows project, repository and branch for a repository-scoped thread", async () => {
    render(() => <RepositoryContextBadge threadId="thread-scoped" port={scopedPort} />);

    await screen.findByText(project.name);
    expect(screen.getByText(repository.name)).toBeInTheDocument();
    expect(screen.getByText("feat/timeline")).toBeInTheDocument();
  });
});
