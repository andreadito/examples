import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadRoot } from '../workspace.js';
import { cacheRootDir, clearCache } from '../cache.js';

export function cacheClear(cwd: string): number {
  const root = loadRoot(cwd);
  const dir = cacheRootDir(root);
  if (!existsSync(dir)) {
    console.log('cache: already empty');
    return 0;
  }
  clearCache(root);
  console.log(`cache: cleared ${dir}`);
  return 0;
}

export function cacheInfo(cwd: string): number {
  const root = loadRoot(cwd);
  const dir = cacheRootDir(root);
  if (!existsSync(dir)) {
    console.log('cache: empty');
    return 0;
  }
  const entries = readdirSync(dir).filter((name) =>
    existsSync(join(dir, name, 'meta.json')),
  );
  console.log(`cache: ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} at ${dir}`);
  for (const key of entries) {
    try {
      const meta = JSON.parse(readFileSync(join(dir, key, 'meta.json'), 'utf8'));
      const size = dirSize(join(dir, key));
      console.log(
        `  ${key.slice(0, 10)}  ${meta.workspace} :: ${meta.script}  (${formatBytes(size)})  ${meta.at}`,
      );
    } catch {
      console.log(`  ${key.slice(0, 10)}  (unreadable)`);
    }
  }
  return 0;
}

function dirSize(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) total += dirSize(full);
    else total += st.size;
  }
  return total;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}
