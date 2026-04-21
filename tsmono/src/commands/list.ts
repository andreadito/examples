import { relative } from 'node:path';
import { loadRoot } from '../workspace.js';

export function list(cwd: string): number {
  const root = loadRoot(cwd);
  const apps = root.workspaces.filter((w) => w.kind === 'app');
  const packages = root.workspaces.filter((w) => w.kind === 'package');

  print('apps', apps, root.dir);
  print('packages', packages, root.dir);
  return 0;
}

function print(
  label: string,
  workspaces: { name: string; dir: string }[],
  rootDir: string,
): void {
  console.log(`${label} (${workspaces.length}):`);
  if (workspaces.length === 0) {
    console.log('  (none)');
    return;
  }
  const width = Math.max(...workspaces.map((w) => w.name.length));
  for (const w of [...workspaces].sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${w.name.padEnd(width)}  ${relative(rootDir, w.dir) || '.'}`);
  }
}
