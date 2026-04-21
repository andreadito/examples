import { loadRoot } from '../workspace.js';
import { buildGraph, topoOrder } from '../graph.js';

export function graph(cwd: string, opts: { json?: boolean } = {}): number {
  const root = loadRoot(cwd);
  const g = buildGraph(root);

  if (opts.json) {
    const payload = {
      nodes: [...g.nodes.values()].map((w) => ({ name: w.name, kind: w.kind })),
      edges: [...g.edges].flatMap(([from, deps]) =>
        [...deps].map((to) => ({ from, to })),
      ),
    };
    console.log(JSON.stringify(payload, null, 2));
    return 0;
  }

  let order: string[];
  try {
    order = topoOrder(g);
  } catch {
    order = [...g.nodes.keys()].sort();
  }

  for (const name of order) {
    const ws = g.nodes.get(name)!;
    const deps = [...(g.edges.get(name) ?? [])].sort();
    const header = `${name} [${ws.kind}]`;
    if (deps.length === 0) {
      console.log(`${header}  (no workspace deps)`);
    } else {
      console.log(header);
      for (const d of deps) console.log(`  -> ${d}`);
    }
  }
  return 0;
}
