// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCauseEffect } from "../effect-boundary";
import { OpenBotDatabase } from "../openbot-database";
import { ProjectStore } from "./project-store";
import { RepositoryError, RepositoryStore } from "./repository-store";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createStores(): Promise<{ projects: ProjectStore; repositories: RepositoryStore }> {
  const root = await mkdtemp(join(tmpdir(), "openbot-repository-store-"));
  roots.push(root);
  const database = new OpenBotDatabase(root);
  await runCauseEffect(database.initialize());
  return { projects: new ProjectStore(database), repositories: new RepositoryStore(database) };
}

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd });
}

async function createRealGitRepo(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `openbot-git-${name}-`));
  roots.push(root);
  git(root, ["init", "--quiet", "--initial-branch=main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  await writeFile(join(root, "README.md"), `# ${name}\n`);
  git(root, ["add", "-A"]);
  git(root, ["commit", "--quiet", "-m", "Initial commit"]);
  return root;
}

describe("RepositoryStore", () => {
  it("imports a real local Git repository and links it to the project", async () => {
    const { projects, repositories } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("import");

    const repository = await repositories.importRepository(project.id, repoPath);

    expect(repository.name).toBe(repoPath.split("/").pop());
    expect(repository.currentBranch).toBe("main");
    expect(repository.health).toBe("available");
    expect(repository.dirty).toBe(false);
    expect(repositories.listRepositoriesForProject(project.id)).toHaveLength(1);
  });

  it("refuses to import a folder that is not a Git working tree", async () => {
    const { projects, repositories } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const notGit = await mkdtemp(join(tmpdir(), "openbot-not-git-"));
    roots.push(notGit);

    await expect(repositories.importRepository(project.id, notGit)).rejects.toThrow(RepositoryError);
  });

  it("refuses to import a path that does not exist", async () => {
    const { projects, repositories } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });

    await expect(repositories.importRepository(project.id, "/no/such/path/openbot-test")).rejects.toThrow(
      RepositoryError,
    );
  });

  it("reuses the existing registration when the same repository is imported into a second project", async () => {
    const { projects, repositories } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const projectA = projects.createProject({ workspaceId: workspace.id, name: "A" });
    const projectB = projects.createProject({ workspaceId: workspace.id, name: "B" });
    const repoPath = await createRealGitRepo("shared");

    const fromA = await repositories.importRepository(projectA.id, repoPath);
    const fromB = await repositories.importRepository(projectB.id, repoPath);

    expect(fromB.id).toBe(fromA.id);
    expect(repositories.listRepositoriesForProject(projectA.id)).toHaveLength(1);
    expect(repositories.listRepositoriesForProject(projectB.id)).toHaveLength(1);
  });

  it("refuses to import the same repository into the same project twice", async () => {
    const { projects, repositories } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("twice");

    await repositories.importRepository(project.id, repoPath);

    await expect(repositories.importRepository(project.id, repoPath)).rejects.toThrow(RepositoryError);
  });

  it("detects a dirty working tree on refresh without touching the files", async () => {
    const { projects, repositories } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("dirty");
    const repository = await repositories.importRepository(project.id, repoPath);
    expect(repository.dirty).toBe(false);

    await writeFile(join(repoPath, "untracked.txt"), "work in progress");
    const refreshed = await repositories.refreshRepository(repository.id);

    expect(refreshed.dirty).toBe(true);
    expect(refreshed.health).toBe("dirty");
  });

  it("marks a repository missing on refresh when its folder is gone, without deleting the registration", async () => {
    const { projects, repositories } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("vanishing");
    const repository = await repositories.importRepository(project.id, repoPath);

    await rm(repoPath, { recursive: true, force: true });
    const refreshed = await repositories.refreshRepository(repository.id);

    expect(refreshed.health).toBe("missing");
    expect(repositories.getRepository(repository.id)).not.toBeNull();
  });

  it("detaches a repository from a project without deleting its registration", async () => {
    const { projects, repositories } = await createStores();
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Mabar Desktop" });
    const repoPath = await createRealGitRepo("detach");
    const repository = await repositories.importRepository(project.id, repoPath);

    repositories.detachRepository(project.id, repository.id);

    expect(repositories.listRepositoriesForProject(project.id)).toHaveLength(0);
    expect(repositories.getRepository(repository.id)).not.toBeNull();
  });
});
