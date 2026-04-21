import { spawnSync } from 'node:child_process';
import { loadRoot } from '../workspace.js';
import { buildGraph, findCycles, topoOrder } from '../graph.js';
import { changedFiles } from '../git.js';
import { computeAffected } from '../affected.js';
import {
  cacheHit,
  cacheKey,
  makeEntry,
  restoreCache,
  storeCache,
  workspaceOutputs,
} from '../cache.js';

export interface RunOptions {
  filter?: string[];
  affected?: { base: string; includeUntracked?: boolean };
  noCache?: boolean;
  force?: boolean;
}

export function run(cwd: string, script: string, opts: RunOptions = {}): number {
  const root = loadRoot(cwd);
  const g = buildGraph(root);

  const cycles = findCycles(g);
  if (cycles.length > 0) {
    console.error(
      'Refusing to run: workspace graph has cycles. Run `tsmono check` for details.',
    );
    return 1;
  }

  const order = topoOrder(g);
  let candidate = new Set(order);

  if (opts.filter && opts.filter.length > 0) {
    const only = new Set(opts.filter);
    candidate = new Set([...candidate].filter((n) => only.has(n)));
  }

  if (opts.affected) {
    const changed = changedFiles({
      cwd: root.dir,
      base: opts.affected.base,
      includeUntracked: opts.affected.includeUntracked,
    });
    const result = computeAffected(root, g, changed);
    if (result.globalChange) {
      console.log(
        `affected: every workspace (global file changed relative to ${opts.affected.base})`,
      );
    } else {
      console.log(
        `affected: ${result.affected.size}/${g.nodes.size} workspace${result.affected.size === 1 ? '' : 's'} (base=${opts.affected.base})`,
      );
    }
    candidate = new Set([...candidate].filter((n) => result.affected.has(n)));
  }

  const targets = order.filter((name) => {
    if (!candidate.has(name)) return false;
    const ws = g.nodes.get(name)!;
    return Boolean(ws.packageJson.scripts?.[script]);
  });

  if (targets.length === 0) {
    console.log(`No workspace has a "${script}" script to run. Nothing to do.`);
    return 0;
  }

  const keyMemo = new Map<string, string>();
  let hits = 0;
  let misses = 0;

  for (const name of targets) {
    const ws = g.nodes.get(name)!;
    const outputs = workspaceOutputs(ws, script);
    const useCache = !opts.noCache && outputs.length > 0;

    let entry: ReturnType<typeof makeEntry> | null = null;
    if (useCache) {
      const key = cacheKey(root, g, ws, script, keyMemo);
      entry = makeEntry(root, key, outputs);
      if (!opts.force && cacheHit(entry)) {
        console.log(`\n> ${name} :: cache hit (${key.slice(0, 10)})`);
        restoreCache(ws, entry);
        hits++;
        continue;
      }
    }

    console.log(`\n> ${name} :: npm run ${script}`);
    const res = spawnSync('npm', ['run', script], {
      cwd: ws.dir,
      stdio: 'inherit',
    });
    if (res.status !== 0) {
      console.error(
        `\n${name} failed with exit code ${res.status ?? 'signal ' + res.signal}`,
      );
      return res.status ?? 1;
    }
    misses++;
    if (useCache && entry) {
      storeCache(ws, entry, script);
      console.log(`  cached as ${entry.key.slice(0, 10)}`);
    }
  }

  const summary = opts.noCache
    ? `${targets.length} workspace${targets.length === 1 ? '' : 's'}`
    : `${targets.length} (${hits} cached, ${misses} ran)`;
  console.log(`\nOK: ran "${script}" in ${summary}`);
  return 0;
}
