import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Root, Workspace } from './workspace.js';
import { buildGraph } from './graph.js';
import { parseJsonc } from './jsonc.js';

export interface TsconfigPlan {
  workspace: string;
  path: string;
  before: unknown | null;
  after: Record<string, unknown>;
  changed: boolean;
  created: boolean;
}

export interface TsconfigRef {
  path: string;
}

/**
 * Compute desired tsconfig.json contents for every workspace.
 * Only touches `references` and `compilerOptions.composite` — everything
 * else is preserved verbatim.
 */
export function planTsconfigs(root: Root): TsconfigPlan[] {
  const graph = buildGraph(root);
  const plans: TsconfigPlan[] = [];

  for (const ws of root.workspaces) {
    const tsPath = join(ws.dir, 'tsconfig.json');
    const existed = existsSync(tsPath);
    const before = existed ? parseJsonc<Record<string, unknown>>(readFileSync(tsPath, 'utf8')) : null;

    const deps = [...(graph.edges.get(ws.name) ?? [])].sort();
    const refs: TsconfigRef[] = deps.map((depName) => {
      const depWs = graph.nodes.get(depName)!;
      return { path: toPosix(relative(ws.dir, depWs.dir)) };
    });

    const after = buildDesired(before, refs, root, ws);
    const changed = !deepEqual(before, after);

    plans.push({
      workspace: ws.name,
      path: tsPath,
      before,
      after,
      changed,
      created: !existed && changed,
    });
  }

  return plans;
}

export function applyTsconfigPlans(plans: TsconfigPlan[]): number {
  let written = 0;
  for (const plan of plans) {
    if (!plan.changed) continue;
    writeFileSync(plan.path, JSON.stringify(plan.after, null, 2) + '\n');
    written++;
  }
  return written;
}

function buildDesired(
  existing: Record<string, unknown> | null,
  refs: TsconfigRef[],
  root: Root,
  ws: Workspace,
): Record<string, unknown> {
  const base: Record<string, unknown> = existing ? { ...existing } : scaffoldTsconfig(root, ws);
  const compilerOptions: Record<string, unknown> = {
    ...(isObject(base['compilerOptions']) ? (base['compilerOptions'] as Record<string, unknown>) : {}),
    composite: true,
  };
  base['compilerOptions'] = compilerOptions;

  if (refs.length === 0) {
    delete base['references'];
  } else {
    base['references'] = refs;
  }

  return orderTopLevelKeys(base);
}

function scaffoldTsconfig(root: Root, ws: Workspace): Record<string, unknown> {
  const rootBase = join(root.dir, 'tsconfig.base.json');
  const out: Record<string, unknown> = {};
  if (existsSync(rootBase)) {
    out['extends'] = toPosix(relative(ws.dir, rootBase));
  }
  out['compilerOptions'] = { outDir: 'dist', rootDir: 'src' };
  out['include'] = ['src/**/*'];
  return out;
}

function orderTopLevelKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const order = ['extends', 'compilerOptions', 'include', 'exclude', 'references'];
  const out: Record<string, unknown> = {};
  for (const k of order) if (k in obj) out[k] = obj[k];
  for (const k of Object.keys(obj)) if (!(k in out)) out[k] = obj[k];
  return out;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (!deepEqual(ao[k], bo[k])) return false;
  return true;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toPosix(p: string): string {
  const s = p.split('\\').join('/');
  return s.startsWith('.') ? s : './' + s;
}
