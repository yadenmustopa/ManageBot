import { execFile } from "node:child_process";
import { resolve, sep } from "node:path";
import { promisify } from "node:util";
import type {
  GitChangedFile,
  GitCommitEntry,
  GitDiffResult,
  GitFileStatus,
  GitReviewSnapshot,
} from "@openbot/contracts/project";

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 15_000;
const GIT_MAX_BUFFER = 4 * 1024 * 1024;
const MAX_DIFF_BYTES = 256 * 1024;

async function git(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER,
      windowsHide: true,
    });
    return stdout;
  } catch {
    return null;
  }
}

function classifyStatus(xy: string): { status: GitFileStatus; staged: boolean } {
  if (xy === "??") return { status: "untracked", staged: false };
  if (xy.includes("U") || xy === "AA" || xy === "DD") return { status: "conflicted", staged: false };
  const x = xy[0] ?? " ";
  const y = xy[1] ?? " ";
  const staged = x !== " " && x !== "?";
  const code = staged ? x : y;
  if (code === "A") return { status: "added", staged };
  if (code === "D") return { status: "deleted", staged };
  if (code === "R" || code === "C") return { status: "renamed", staged };
  return { status: "modified", staged };
}

function parseStatusOutput(stdout: string): GitChangedFile[] {
  const files: GitChangedFile[] = [];
  for (const rawLine of stdout.split("\n")) {
    if (rawLine.length < 4) continue;
    const xy = rawLine.slice(0, 2);
    const rawPath = rawLine.slice(3).trim();
    if (!rawPath) continue;
    const arrowIndex = rawPath.indexOf(" -> ");
    const path = arrowIndex !== -1 ? rawPath.slice(arrowIndex + 4) : rawPath;
    const { status, staged } = classifyStatus(xy);
    files.push({ path, status, staged });
  }
  return files;
}

function parseCommitsOutput(stdout: string): GitCommitEntry[] {
  const commits: GitCommitEntry[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    const [hash, shortHash, subject, author, authoredAt] = line.split("\x1f");
    if (!hash || !shortHash || subject === undefined || !author || !authoredAt) continue;
    commits.push({ hash, shortHash, subject, author, authoredAt });
  }
  return commits;
}

export async function inspectGitReview(targetPath: string): Promise<GitReviewSnapshot> {
  const [branchOut, statusOut, logOut] = await Promise.all([
    git(targetPath, ["branch", "--show-current"]),
    git(targetPath, ["status", "--porcelain=v1"]),
    git(targetPath, ["log", "-n", "20", "--format=%H%x1f%h%x1f%s%x1f%an%x1f%aI"]),
  ]);
  const files = statusOut ? parseStatusOutput(statusOut) : [];
  const commits = logOut ? parseCommitsOutput(logOut) : [];
  const currentBranch = branchOut && branchOut.trim().length > 0 ? branchOut.trim() : null;
  return {
    targetPath,
    currentBranch,
    files,
    commits,
    hasConflicts: files.some((file) => file.status === "conflicted"),
  };
}

export function resolveSafeRepoFilePath(targetPath: string, filePath: string): string | null {
  const root = resolve(targetPath);
  const resolved = resolve(root, filePath);
  if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) return null;
  return resolved;
}

export async function readGitDiff(
  targetPath: string,
  options: { filePath?: string | null; staged?: boolean },
): Promise<GitDiffResult> {
  if (options.filePath) {
    const safePath = resolveSafeRepoFilePath(targetPath, options.filePath);
    if (!safePath) return { diff: "", truncated: false, binary: false };
  }
  const args = ["diff", "--no-color", ...(options.staged ? ["--cached"] : [])];
  if (options.filePath) args.push("--", options.filePath);
  const stdout = await git(targetPath, args);
  if (stdout === null) return { diff: "", truncated: false, binary: false };
  const binary = /^Binary files .* differ$/m.test(stdout);
  if (Buffer.byteLength(stdout, "utf8") > MAX_DIFF_BYTES) {
    return {
      diff: Buffer.from(stdout, "utf8").subarray(0, MAX_DIFF_BYTES).toString("utf8"),
      truncated: true,
      binary,
    };
  }
  return { diff: stdout, truncated: false, binary };
}
