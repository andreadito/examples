import { spawnSync } from 'node:child_process';
import { loadRoot } from '../workspace.js';
import { buildGraph, findCycles, topoOrder } from '../graph.js';

export interface RunOptions {
  filter?: string[];
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
  const filter = opts.filter && opts.filter.length > 0 ? new Set(opts.filter) : null;

  const targets = order.filter((name) => {
    if (filter && !filter.has(name)) return false;
    const ws = g.nodes.get(name)!;
    return Boolean(ws.packageJson.scripts?.[script]);
  });

  if (targets.length === 0) {
    console.log(`No workspace has a "${script}" script. Nothing to do.`);
    return 0;
  }

  for (const name of targets) {
    const ws = g.nodes.get(name)!;
    console.log(`\n> ${name} :: npm run ${script}`);
    const res = spawnSync('npm', ['run', script], {
      cwd: ws.dir,
      stdio: 'inherit',
    });
    if (res.status !== 0) {
      console.error(`\n${name} failed with exit code ${res.status ?? 'signal ' + res.signal}`);
      return res.status ?? 1;
    }
  }
  console.log(`\nOK: ran "${script}" in ${targets.length} workspace${targets.length === 1 ? '' : 's'}`);
  return 0;
}
