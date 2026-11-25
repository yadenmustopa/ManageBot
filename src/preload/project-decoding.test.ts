// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  decodeProject,
  decodeProjectDashboardSummary,
  decodeProjectList,
  decodeProjectOrNull,
  decodeRepository,
  decodeRepositoryList,
  decodeWorkspace,
  decodeWorkspaceList,
} from "./project-decoding";

const WORKSPACE = {
  id: "workspace-1",
  name: "My Workspace",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archivedAt: null,
};

const PROJECT = {
  id: "project-1",
  workspaceId: "workspace-1",
  name: "Mabar Desktop",
  description: "",
  icon: null,
  color: null,
  pinned: false,
  sortOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archivedAt: null,
};

const REPOSITORY = {
  id: "repo-1",
  hostId: "local",
  name: "mabar-desktop",
  canonicalPath: "/home/sam/mabar-desktop",
  remoteUrl: null,
  currentBranch: "main",
  defaultBranch: "main",
  dirty: false,
  health: "available",
  lastRefreshedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archivedAt: null,
};

describe("decodeWorkspace", () => {
  it("keeps a valid workspace", () => {
    expect(decodeWorkspace(WORKSPACE)).toEqual(WORKSPACE);
  });

  it("refuses a workspace missing a field", () => {
    const { name: _name, ...withoutName } = WORKSPACE;
    expect(() => decodeWorkspace(withoutName)).toThrow();
  });

  it("decodes a workspace list", () => {
    expect(decodeWorkspaceList([WORKSPACE])).toEqual([WORKSPACE]);
  });
});

describe("decodeProject", () => {
  it("keeps a valid project", () => {
    expect(decodeProject(PROJECT)).toEqual(PROJECT);
  });

  it("refuses a project with the wrong type for pinned", () => {
    expect(() => decodeProject({ ...PROJECT, pinned: "no" })).toThrow();
  });

  it("decodes a project list", () => {
    expect(decodeProjectList([PROJECT])).toEqual([PROJECT]);
  });

  it("decodes a null project as null, and a present one as a project", () => {
    expect(decodeProjectOrNull(null)).toBeNull();
    expect(decodeProjectOrNull(PROJECT)).toEqual(PROJECT);
  });
});

describe("decodeRepository", () => {
  it("keeps a valid repository", () => {
    expect(decodeRepository(REPOSITORY)).toEqual(REPOSITORY);
  });

  it("refuses a repository with an unknown health value", () => {
    expect(() => decodeRepository({ ...REPOSITORY, health: "unknown" })).toThrow();
  });

  it("decodes a repository list", () => {
    expect(decodeRepositoryList([REPOSITORY])).toEqual([REPOSITORY]);
  });
});

describe("decodeProjectDashboardSummary", () => {
  it("keeps a valid summary", () => {
    const summary = { projectId: "project-1", repositoryCount: 2 };
    expect(decodeProjectDashboardSummary(summary)).toEqual(summary);
  });

  it("refuses a summary without a repository count", () => {
    expect(() => decodeProjectDashboardSummary({ projectId: "project-1" })).toThrow();
  });
});
