import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCauseEffect } from "../effect-boundary";
import { OpenBotDatabase } from "../openbot-database";
import { searchProjectFiles } from "./project-file-search";
import { ProjectStore } from "./project-store";
import { RepositoryStore } from "./repository-store";
import { ThreadRepositoryScopeStore } from "./thread-repository-scope";

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const dir = roots.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("searchProjectFiles", () => {
  it("searches files across all folders in a project by threadId and skips ignored directories", async () => {
    const dbRoot = await mkdtemp(join(tmpdir(), "openbot-search-db-"));
    roots.push(dbRoot);
    const database = new OpenBotDatabase(dbRoot);
    await runCauseEffect(database.initialize());
    database.replaceAgents(
      "agents-import",
      [
        {
          id: "agent-search",
          provider: "codex",
          name: "agent-search",
          title: "",
          description: "",
          notifications: true,
          model: "gpt-5.6-luna",
          reasoningEffort: "medium",
          threadId: "thread-search",
          workspacePath: dbRoot,
          preview: "",
          updatedAt: "2026-08-18T10:00:01.000Z",
          avatarSeed: "agent-search",
          avatarHue: null,
          avatarUrl: null,
        },
      ],
      "agents.imported",
    );
    const projects = new ProjectStore(database);
    const repositories = new RepositoryStore(database);
    const scopes = new ThreadRepositoryScopeStore(database);
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Multi Folder Search" });

    const folderA = await mkdtemp(join(tmpdir(), "openbot-search-a-"));
    const folderB = await mkdtemp(join(tmpdir(), "openbot-search-b-"));
    roots.push(folderA, folderB);

    await mkdir(join(folderA, "src"), { recursive: true });
    await mkdir(join(folderA, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(folderA, "src", "app-config.ts"), "export const x = 1;\n");
    await writeFile(join(folderA, "node_modules", "pkg", "ignored-config.ts"), "export const y = 2;\n");

    await mkdir(join(folderB, "docs"), { recursive: true });
    await writeFile(join(folderB, "docs", "api-config.md"), "# API Config\n");

    const repoA = await repositories.importRepository(project.id, folderA);
    await repositories.importRepository(project.id, folderB);
    scopes.setScope("thread-search", project.id, repoA.id);

    const results = await searchProjectFiles(scopes, repositories, {
      threadId: "thread-search",
      query: "config",
    });

    expect(results.map((item) => item.relativePath)).toEqual(["src/app-config.ts", "docs/api-config.md"]);
  });
});
