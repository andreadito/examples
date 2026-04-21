import type { Workspace, Root } from './workspace.js';
import { declaredDeps } from './workspace.js';

export interface Graph {
  nodes: Map<string, Workspace>;
  edges: Map<string, Set<string>>;
}

export function buildGraph(root: Root): Graph {
  const nodes = new Map<string, Workspace>();
  for (const ws of root.workspaces) nodes.set(ws.name, ws);

  const edges = new Map<string, Set<string>>();
  for (const ws of root.workspaces) {
    const deps = new Set<string>();
    for (const dep of Object.keys(declaredDeps(ws.packageJson))) {
      if (dep === ws.name) continue;
      if (nodes.has(dep)) deps.add(dep);
    }
    edges.set(ws.name, deps);
  }
  return { nodes, edges };
}

export function findCycles(graph: Graph): string[][] {
  const UNVISITED = 0;
  const ON_STACK = 1;
  const DONE = 2;
  const state = new Map<string, number>();
  for (const name of graph.nodes.keys()) state.set(name, UNVISITED);

  const cycles: string[][] = [];
  const seen = new Set<string>();
  const stack: string[] = [];

  const visit = (node: string): void => {
    state.set(node, ON_STACK);
    stack.push(node);
    for (const next of sorted(graph.edges.get(node))) {
      const s = state.get(next);
      if (s === ON_STACK) {
        const idx = stack.indexOf(next);
        const cycle = stack.slice(idx).concat(next);
        const key = canonicalCycleKey(cycle);
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(cycle);
        }
      } else if (s === UNVISITED) {
        visit(next);
      }
    }
    stack.pop();
    state.set(node, DONE);
  };

  for (const name of [...graph.nodes.keys()].sort()) {
    if (state.get(name) === UNVISITED) visit(name);
  }
  return cycles;
}

export function topoOrder(graph: Graph): string[] {
  const remaining = new Map<string, Set<string>>();
  for (const [n, deps] of graph.edges) remaining.set(n, new Set(deps));

  const order: string[] = [];
  while (remaining.size > 0) {
    const ready: string[] = [];
    for (const [n, deps] of remaining) if (deps.size === 0) ready.push(n);
    if (ready.length === 0) {
      throw new Error(
        'Cannot produce a topological order: the workspace graph has cycles. Run `tsmono check` to see them.',
      );
    }
    ready.sort();
    for (const n of ready) {
      order.push(n);
      remaining.delete(n);
    }
    for (const deps of remaining.values()) {
      for (const n of ready) deps.delete(n);
    }
  }
  return order;
}

export function dependentsOf(graph: Graph, name: string): Set<string> {
  const out = new Set<string>();
  for (const [n, deps] of graph.edges) if (deps.has(name)) out.add(n);
  return out;
}

function sorted(set: Set<string> | undefined): string[] {
  return set ? [...set].sort() : [];
}

function canonicalCycleKey(cycle: string[]): string {
  // cycle is closed: first === last. Normalize by rotating so the lexicographically
  // smallest node leads, then drop the duplicate closing node for the key.
  const open = cycle.slice(0, -1);
  if (open.length === 0) return '';
  let minIdx = 0;
  for (let i = 1; i < open.length; i++) {
    if (open[i]! < open[minIdx]!) minIdx = i;
  }
  const rotated = open.slice(minIdx).concat(open.slice(0, minIdx));
  return rotated.join('>');
}
