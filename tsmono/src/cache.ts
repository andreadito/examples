import { createHash } from 'node:crypto';
import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
  mkdirSync,
  cpSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import type { Workspace, Root } from './workspace.js';
import type { Graph } from './graph.js';

export const CACHE_DIR_NAME = '.tsmono-cache';

const ALWAYS_EXCLUDE_DIRS = new Set(['node_modules', '.git', CACHE_DIR_NAME]);
const ALWAYS_EXCLUDE_EXT = new Set(['.log', '.tsbuildinfo']);
const ALWAYS_EXCLUDE_FILES = new Set(['.DS_Store', 'Thumbs.db']);

export interface CacheEntry {
  key: string;
  outputs: string[];
  dir: string;
}

export function cacheRootDir(root: Root): string {
  return join(root.dir, CACHE_DIR_NAME);
}

export function workspaceOutputs(ws: Workspace, script: string): string[] {
  const raw = ws.packageJson.tsmono?.outputs?.[script];
  if (!raw) return [];
  return raw
    .filter((p) => typeof p === 'string' && p.length > 0 && !p.startsWith('/') && !p.includes('..'))
    .map((p) => toPosix(p))
    .sort();
}

/**
 * Content-addressed key for running `script` in `ws`, combining:
 *  - the workspace's tracked file contents,
 *  - the script's declared command,
 *  - the root lockfile hash (captures external dep changes),
 *  - and the cache keys of every workspace dep (transitively).
 */
export function cacheKey(
  root: Root,
  graph: Graph,
  ws: Workspace,
  script: string,
  memo = new Map<string, string>(),
): string {
  const cached = memo.get(ws.name);
  if (cached) return cached;

  const depNames = [...(graph.edges.get(ws.name) ?? [])].sort();
  const depKeys = depNames.map((d) =>
    cacheKey(root, graph, graph.nodes.get(d)!, script, memo),
  );
  const outputs = workspaceOutputs(ws, script);
  const content = contentHash(ws, outputs);
  const lock = hashLockfile(root);

  const h = createHash('sha256');
  h.update('tsmono:v1\n');
  h.update('workspace:' + ws.name + '\n');
  h.update('script:' + script + '\n');
  h.update('cmd:' + (ws.packageJson.scripts?.[script] ?? '') + '\n');
  h.update('lock:' + lock + '\n');
  h.update('outputs:' + outputs.join(',') + '\n');
  h.update('content:' + content + '\n');
  for (let i = 0; i < depNames.length; i++) {
    h.update(`dep:${depNames[i]}=${depKeys[i]}\n`);
  }

  const key = h.digest('hex');
  memo.set(ws.name, key);
  return key;
}

export function makeEntry(root: Root, key: string, outputs: string[]): CacheEntry {
  return { key, outputs, dir: join(cacheRootDir(root), key) };
}

export function cacheHit(entry: CacheEntry): boolean {
  return existsSync(join(entry.dir, 'meta.json'));
}

export function restoreCache(ws: Workspace, entry: CacheEntry): void {
  for (const rel of entry.outputs) {
    const src = join(entry.dir, 'outputs', rel);
    if (!existsSync(src)) continue;
    const dest = join(ws.dir, rel);
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
}

export function storeCache(ws: Workspace, entry: CacheEntry, script: string): void {
  mkdirSync(join(entry.dir, 'outputs'), { recursive: true });
  const storedOutputs: string[] = [];
  for (const rel of entry.outputs) {
    const src = join(ws.dir, rel);
    if (!existsSync(src)) continue;
    const dest = join(entry.dir, 'outputs', rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
    storedOutputs.push(rel);
  }
  writeFileSync(
    join(entry.dir, 'meta.json'),
    JSON.stringify(
      {
        workspace: ws.name,
        script,
        key: entry.key,
        outputs: storedOutputs,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

export function clearCache(root: Root): void {
  rmSync(cacheRootDir(root), { recursive: true, force: true });
}

export function contentHash(ws: Workspace, outputs: string[]): string {
  const excludeDirs = new Set<string>([...ALWAYS_EXCLUDE_DIRS, ...outputs.map((o) => o.split('/')[0] ?? o)]);
  const files = walkFiles(ws.dir, excludeDirs).sort();
  const h = createHash('sha256');
  for (const rel of files) {
    h.update(rel);
    h.update('\0');
    h.update(readFileSync(join(ws.dir, rel)));
    h.update('\0');
  }
  return h.digest('hex');
}

function walkFiles(root: string, excludeDirs: Set<string>): string[] {
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.') && entry !== '.env' && entry !== '.env.example') continue;
      if (ALWAYS_EXCLUDE_FILES.has(entry)) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (excludeDirs.has(entry)) continue;
        visit(full);
      } else if (st.isFile()) {
        if (hasExcludedExt(entry)) continue;
        out.push(toPosix(relative(root, full)));
      }
    }
  };
  visit(root);
  return out;
}

function hasExcludedExt(name: string): boolean {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return false;
  return ALWAYS_EXCLUDE_EXT.has(name.slice(dot));
}

function hashLockfile(root: Root): string {
  const lock = join(root.dir, 'package-lock.json');
  if (!existsSync(lock)) return 'nolock';
  return createHash('sha256').update(readFileSync(lock)).digest('hex');
}

function toPosix(p: string): string {
  return sep === '/' ? p : p.split(sep).join('/');
}
