import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  GitHubIssueSummary,
  GitHubPullRequestSummary,
  GitHubRepositoryOverview,
} from "@openbot/contracts/project";
import { isDynamicRecord } from "../migrations/runtime-values";

const execFileAsync = promisify(execFile);

const GH_TIMEOUT_MS = 15_000;
const GH_MAX_BUFFER = 2 * 1024 * 1024;

export function parseGitHubRemote(remoteUrl: string | null): { owner: string; repo: string } | null {
  if (!remoteUrl) return null;
  const sshMatch = remoteUrl.trim().match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch?.[1] && sshMatch[2]) return { owner: sshMatch[1], repo: sshMatch[2] };
  const httpsMatch = remoteUrl.trim().match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  if (httpsMatch?.[1] && httpsMatch[2]) return { owner: httpsMatch[1], repo: httpsMatch[2] };
  return null;
}

async function gh(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("gh", args, {
    cwd,
    timeout: GH_TIMEOUT_MS,
    maxBuffer: GH_MAX_BUFFER,
    windowsHide: true,
  });
  return stdout;
}

function parseIssues(raw: unknown): GitHubIssueSummary[] {
  if (!Array.isArray(raw)) return [];
  const items: GitHubIssueSummary[] = [];
  for (const entry of raw) {
    if (
      !isDynamicRecord(entry) ||
      typeof entry.number !== "number" ||
      typeof entry.title !== "string" ||
      typeof entry.state !== "string" ||
      typeof entry.url !== "string" ||
      typeof entry.updatedAt !== "string"
    )
      continue;
    const author = isDynamicRecord(entry.author) && typeof entry.author.login === "string" ? entry.author.login : null;
    items.push({
      number: entry.number,
      title: entry.title,
      state: entry.state,
      url: entry.url,
      author,
      updatedAt: entry.updatedAt,
    });
  }
  return items;
}

function parsePullRequests(raw: unknown): GitHubPullRequestSummary[] {
  if (!Array.isArray(raw)) return [];
  const items: GitHubPullRequestSummary[] = [];
  for (const entry of raw) {
    if (
      !isDynamicRecord(entry) ||
      typeof entry.number !== "number" ||
      typeof entry.title !== "string" ||
      typeof entry.state !== "string" ||
      typeof entry.url !== "string" ||
      typeof entry.headRefName !== "string" ||
      typeof entry.baseRefName !== "string" ||
      typeof entry.isDraft !== "boolean" ||
      typeof entry.updatedAt !== "string"
    )
      continue;
    items.push({
      number: entry.number,
      title: entry.title,
      state: entry.state,
      url: entry.url,
      headBranch: entry.headRefName,
      baseBranch: entry.baseRefName,
      isDraft: entry.isDraft,
      reviewDecision: typeof entry.reviewDecision === "string" ? entry.reviewDecision : null,
      updatedAt: entry.updatedAt,
    });
  }
  return items;
}

export async function fetchGitHubOverview(remoteUrl: string | null, cwd: string): Promise<GitHubRepositoryOverview> {
  const parsed = parseGitHubRemote(remoteUrl);
  if (!parsed) {
    return { owner: "", repo: "", issues: [], pullRequests: [], error: "Not a GitHub remote." };
  }
  const slug = `${parsed.owner}/${parsed.repo}`;
  try {
    const [issuesRaw, prsRaw] = await Promise.all([
      gh(cwd, ["issue", "list", "--repo", slug, "--json", "number,title,state,url,author,updatedAt", "--limit", "20"]),
      gh(cwd, [
        "pr",
        "list",
        "--repo",
        slug,
        "--json",
        "number,title,state,url,headRefName,baseRefName,isDraft,reviewDecision,updatedAt",
        "--limit",
        "20",
      ]),
    ]);
    return {
      owner: parsed.owner,
      repo: parsed.repo,
      issues: parseIssues(JSON.parse(issuesRaw)),
      pullRequests: parsePullRequests(JSON.parse(prsRaw)),
      error: null,
    };
  } catch (cause) {
    return {
      owner: parsed.owner,
      repo: parsed.repo,
      issues: [],
      pullRequests: [],
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

export async function createGitHubPullRequest(
  cwd: string,
  input: { title: string; body?: string; baseBranch?: string | null; draft?: boolean },
): Promise<string> {
  const args = ["pr", "create", "--title", input.title.trim(), "--body", input.body ?? ""];
  if (input.baseBranch) args.push("--base", input.baseBranch);
  if (input.draft) args.push("--draft");
  const stdout = await gh(cwd, args);
  return stdout.trim();
}
