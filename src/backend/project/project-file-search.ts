import { readdir } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type { ProjectFileMatch, SearchProjectFilesInput } from "@openbot/contracts/project";
import type { RepositoryStore } from "./repository-store";
import type { ThreadRepositoryScopeStore } from "./thread-repository-scope";

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "out",
  "build",
  ".turbo",
  ".cache",
  "target",
  ".venv",
]);

const MAX_DEPTH = 6;
const MAX_VISITED_ENTRIES = 4000;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

function resolveRoots(
  threadRepositoryScopes: ThreadRepositoryScopeStore,
  repositories: RepositoryStore,
  input: SearchProjectFilesInput,
): { name: string; canonicalPath: string }[] {
  const projectId =
    input.projectId ?? (input.threadId ? threadRepositoryScopes.getScope(input.threadId).projectId : null);
  if (!projectId) return [];
  const seen = new Set<string>();
  const roots: { name: string; canonicalPath: string }[] = [];
  for (const repository of repositories.listRepositoriesForProject(projectId)) {
    if (seen.has(repository.canonicalPath)) continue;
    seen.add(repository.canonicalPath);
    roots.push({ name: repository.name, canonicalPath: repository.canonicalPath });
  }
  return roots;
}

function matchRank(match: ProjectFileMatch, needle: string): number {
  if (!needle) return 3;
  const fileName = basename(match.relativePath).toLowerCase();
  const rel = match.relativePath.toLowerCase();
  if (fileName.startsWith(needle)) return 0;
  if (rel.startsWith(needle)) return 1;
  if (rel.includes(needle) || `${match.rootName.toLowerCase()}/${rel}`.includes(needle)) return 2;
  return -1;
}

async function collectFilesFromRoot(
  root: { name: string; canonicalPath: string },
  needle: string,
  budget: { visited: number },
  results: { match: ProjectFileMatch; rank: number }[],
): Promise<void> {
  const queue: { dir: string; depth: number }[] = [{ dir: root.canonicalPath, depth: 0 }];
  while (queue.length > 0 && budget.visited < MAX_VISITED_ENTRIES) {
    const current = queue.shift();
    if (!current) break;
    const entries = await readdir(current.dir, { withFileTypes: true }).catch(() => null);
    if (!entries) continue;
    for (const entry of entries) {
      if (budget.visited >= MAX_VISITED_ENTRIES) break;
      budget.visited += 1;
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name) && current.depth < MAX_DEPTH) {
          queue.push({ dir: join(current.dir, entry.name), depth: current.depth + 1 });
        }
        continue;
      }
      if (!entry.isFile()) continue;
      const fullPath = join(current.dir, entry.name);
      const relativePath = relative(root.canonicalPath, fullPath).replaceAll("\\", "/");
      const candidate: ProjectFileMatch = {
        path: fullPath,
        relativePath,
        rootName: root.name,
        rootPath: root.canonicalPath,
      };
      const rank = matchRank(candidate, needle);
      if (rank >= 0) results.push({ match: candidate, rank });
    }
  }
}

export async function searchProjectFiles(
  threadRepositoryScopes: ThreadRepositoryScopeStore,
  repositories: RepositoryStore,
  input: SearchProjectFilesInput,
): Promise<ProjectFileMatch[]> {
  const roots = resolveRoots(threadRepositoryScopes, repositories, input);
  if (roots.length === 0) return [];
  const limit = Math.max(1, Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
  const needle = input.query.trim().toLowerCase();
  const budget = { visited: 0 };
  const collected: { match: ProjectFileMatch; rank: number }[] = [];
  for (const root of roots) {
    await collectFilesFromRoot(root, needle, budget, collected);
  }
  collected.sort(
    (left, right) =>
      left.rank - right.rank ||
      left.match.relativePath.length - right.match.relativePath.length ||
      left.match.relativePath.localeCompare(right.match.relativePath),
  );
  return collected.slice(0, limit).map((item) => item.match);
}
