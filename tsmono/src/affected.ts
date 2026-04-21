import { relative, sep } from 'node:path';
import type { Root } from './workspace.js';
import { type Graph, dependentsOf } from './graph.js';

export interface AffectedResult {
  directlyChanged: Set<string>;
  affected: Set<string>;
  globalChange: boolean;
  unattributed: string[];
}

/**
 * Given a set of changed file paths (relative to the monorepo root),
 * returns which workspaces are affected. A workspace is affected if:
 *   - one of its files changed, or
 *   - (transitively) it depends on a workspace that changed.
 *
 * A "global" change (a path outside any workspace — e.g. root package.json,
 * tsconfig.base.json, a root config file) treats every workspace as affected.
 */
export function computeAffected(
  root: Root,
  graph: Graph,
  changedPaths: string[],
): AffectedResult {
  const directlyChanged = new Set<string>();
  const unattributed: string[] = [];
  let globalChange = false;

  const byDir: Array<{ name: string; prefix: string }> = root.workspaces
    .map((w) => ({ name: w.name, prefix: posix(relative(root.dir, w.dir)) + '/' }))
    .sort((a, b) => b.prefix.length - a.prefix.length);

  for (const raw of changedPaths) {
    const path = posix(raw);
    const match = byDir.find((w) => path.startsWith(w.prefix));
    if (match) {
      directlyChanged.add(match.name);
    } else if (isGlobalPath(path)) {
      globalChange = true;
    } else {
      unattributed.push(path);
    }
  }

  let affected: Set<string>;
  if (globalChange) {
    affected = new Set(graph.nodes.keys());
  } else {
    affected = new Set(directlyChanged);
    const queue = [...directlyChanged];
    while (queue.length > 0) {
      const n = queue.shift()!;
      for (const dep of dependentsOf(graph, n)) {
        if (!affected.has(dep)) {
          affected.add(dep);
          queue.push(dep);
        }
      }
    }
  }

  return { directlyChanged, affected, globalChange, unattributed };
}

function posix(p: string): string {
  return sep === '/' ? p : p.split(sep).join('/');
}

function isGlobalPath(path: string): boolean {
  // Paths at the repo root that influence every workspace's build.
  if (path.includes('/')) return false;
  return (
    path === 'package.json' ||
    path === 'package-lock.json' ||
    path === 'yarn.lock' ||
    path === 'pnpm-lock.yaml' ||
    path === 'tsconfig.base.json' ||
    path === 'tsconfig.json' ||
    path.endsWith('.config.js') ||
    path.endsWith('.config.ts') ||
    path.endsWith('.config.mjs') ||
    path.endsWith('.config.cjs')
  );
}
