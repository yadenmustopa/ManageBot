// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectGitReview, readGitDiff, resolveSafeRepoFilePath } from "./git-review";
import { parseGitHubRemote } from "./github-review";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd });
}

async function createRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "openbot-git-review-"));
  roots.push(root);
  git(root, ["init", "--quiet", "--initial-branch=main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  await writeFile(join(root, "README.md"), "# Hello\n");
  git(root, ["add", "-A"]);
  git(root, ["commit", "--quiet", "-m", "Initial commit"]);
  return root;
}

describe("git-review", () => {
  it("inspects changed, staged, and untracked files plus commit history", async () => {
    const repo = await createRepo();
    await writeFile(join(repo, "README.md"), "# Updated\n");
    await writeFile(join(repo, "staged.txt"), "staged\n");
    git(repo, ["add", "staged.txt"]);
    await writeFile(join(repo, "untracked.txt"), "untracked\n");

    const snapshot = await inspectGitReview(repo);
    expect(snapshot.currentBranch).toBe("main");
    expect(snapshot.hasConflicts).toBe(false);
    expect(snapshot.commits).toHaveLength(1);
    expect(snapshot.commits[0]?.subject).toBe("Initial commit");
    expect(snapshot.files).toEqual(
      expect.arrayContaining([
        { path: "README.md", status: "modified", staged: false },
        { path: "staged.txt", status: "added", staged: true },
        { path: "untracked.txt", status: "untracked", staged: false },
      ]),
    );
  });

  it("reads unstaged and staged diffs and blocks path traversal", async () => {
    const repo = await createRepo();
    await writeFile(join(repo, "README.md"), "# Changed\n");
    await writeFile(join(repo, "staged.txt"), "staged\n");
    git(repo, ["add", "staged.txt"]);

    const unstaged = await readGitDiff(repo, { filePath: "README.md", staged: false });
    expect(unstaged.diff).toContain("+# Changed");
    expect(unstaged.truncated).toBe(false);

    const staged = await readGitDiff(repo, { filePath: "staged.txt", staged: true });
    expect(staged.diff).toContain("+staged");

    expect(resolveSafeRepoFilePath(repo, "../../etc/passwd")).toBeNull();
    const blocked = await readGitDiff(repo, { filePath: "../../etc/passwd", staged: false });
    expect(blocked.diff).toBe("");
  });

  it("parses ssh and https GitHub remote URLs", () => {
    expect(parseGitHubRemote("git@github.com:yadenmustopa/ManageBot.git")).toEqual({
      owner: "yadenmustopa",
      repo: "ManageBot",
    });
    expect(parseGitHubRemote("https://github.com/nightly-labs/openbot.git")).toEqual({
      owner: "nightly-labs",
      repo: "openbot",
    });
    expect(parseGitHubRemote("https://gitlab.com/org/repo.git")).toBeNull();
  });
});
