import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isDynamicRecord } from "../migrations/runtime-values";

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 20_000;
const GIT_MAX_BUFFER = 4 * 1024 * 1024;

export class GitWorktreeCommandError extends Error {}

function stderrOf(cause: unknown): string {
  if (isDynamicRecord(cause)) {
    const stderr = cause.stderr;
    if (typeof stderr === "string" && stderr.trim().length > 0) return stderr.trim();
  }
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Runs one `git worktree` subcommand with a fixed argument array (never a shell string) in `cwd`.
 * Unlike `git-inspect.ts`'s read-only `git()` helper, which swallows every failure into `null`,
 * `add`/`remove` are the first *mutating* git subprocess calls in this codebase: a caller needs
 * git's real error message (e.g. "branch already exists", "contains modified or untracked files")
 * to turn into a specific, user-visible error, so this throws `GitWorktreeCommandError` instead.
 */
async function gitWorktree(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["worktree", ...args], {
      cwd,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER,
      windowsHide: true,
    });
    return stdout;
  } catch (cause) {
    throw new GitWorktreeCommandError(stderrOf(cause));
  }
}

export interface GitWorktreeEntry {
  path: string;
  /** null when the worktree's HEAD is detached. */
  branch: string | null;
}

/** Parses `git worktree list --porcelain`'s blank-line-separated record format. */
export async function listGitWorktrees(repositoryPath: string): Promise<GitWorktreeEntry[]> {
  const stdout = await gitWorktree(repositoryPath, ["list", "--porcelain"]);
  const entries: GitWorktreeEntry[] = [];
  let path: string | null = null;
  let branch: string | null = null;
  const flush = () => {
    if (path !== null) entries.push({ path, branch });
    path = null;
    branch = null;
  };
  for (const line of stdout.split("\n")) {
    if (line.startsWith("worktree ")) {
      flush();
      path = line.slice("worktree ".length);
    } else if (line.startsWith("branch ")) {
      const ref = line.slice("branch ".length);
      branch = ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : ref;
    } else if (line === "detached") {
      branch = null;
    }
  }
  flush();
  return entries;
}

/**
 * Delegates branch-name validity to git's own authoritative checker rather than hand-rolling ref
 * syntax rules (PRD 11.3 "prevent directory traversal" / validate untrusted input before it reaches
 * a subprocess or a filesystem path).
 */
export async function isValidBranchName(branchName: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["check-ref-format", "--branch", branchName], {
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function createGitWorktree(
  repositoryPath: string,
  worktreePath: string,
  branchName: string,
  baseRef: string | null,
): Promise<void> {
  const args = ["add", "-b", branchName, worktreePath, ...(baseRef ? [baseRef] : [])];
  await gitWorktree(repositoryPath, args);
}

/** `force` must come from an explicit, authorized caller — see `WorktreeStore.removeWorktree`. */
export async function removeGitWorktree(repositoryPath: string, worktreePath: string, force: boolean): Promise<void> {
  await gitWorktree(repositoryPath, ["remove", ...(force ? ["--force"] : []), worktreePath]);
}
