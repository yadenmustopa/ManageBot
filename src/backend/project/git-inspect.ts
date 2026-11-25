import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 10_000;
const GIT_MAX_BUFFER = 4 * 1024 * 1024;

/**
 * Runs one read-only `git` subcommand with an argument array (never a shell string) in `cwd`.
 * Per PRD 11.3 ("use argument-safe subprocess execution", "do not interpolate untrusted input into
 * shell commands"): every caller here passes a fixed, hardcoded `args` array, and the only
 * untrusted value is `cwd` itself, which the caller must have already resolved to a real directory.
 */
async function git(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER,
      windowsHide: true,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export interface GitInspection {
  isWorkingTree: boolean;
  toplevel: string | null;
  remoteUrl: string | null;
  /** null when HEAD is detached or the branch cannot be read. */
  currentBranch: string | null;
  /** Best-effort; null when there is no `origin` remote-tracking HEAD to read. */
  defaultBranch: string | null;
  /** null only when the dirty check itself failed (e.g. git missing); true/false otherwise. */
  dirty: boolean | null;
}

export async function inspectGitRepository(path: string): Promise<GitInspection> {
  const isWorkingTree = (await git(path, ["rev-parse", "--is-inside-work-tree"])) === "true";
  if (!isWorkingTree) {
    return {
      isWorkingTree: false,
      toplevel: null,
      remoteUrl: null,
      currentBranch: null,
      defaultBranch: null,
      dirty: null,
    };
  }
  const toplevel = await git(path, ["rev-parse", "--show-toplevel"]);
  const remoteUrl = await git(path, ["remote", "get-url", "origin"]);
  const branch = await git(path, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const currentBranch = branch === null || branch === "HEAD" ? null : branch;
  const defaultBranchRef = await git(path, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
  const defaultBranch = defaultBranchRef?.startsWith("origin/")
    ? defaultBranchRef.slice("origin/".length)
    : defaultBranchRef;
  const status = await git(path, ["status", "--porcelain"]);
  const dirty = status === null ? null : status.length > 0;
  return { isWorkingTree, toplevel, remoteUrl, currentBranch, defaultBranch, dirty };
}
