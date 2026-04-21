import type { Root, Workspace } from './workspace.js';
import { declaredDeps } from './workspace.js';

export type DepSource = 'workspace' | 'local' | 'root' | 'undeclared';

export interface ResolvedDep {
  name: string;
  range: string;
  source: DepSource;
}

export function resolveDeps(root: Root, ws: Workspace): ResolvedDep[] {
  const workspaceNames = new Set(root.workspaces.map((w) => w.name));
  const rootDeps = declaredDeps(root.packageJson);
  const localDeps = declaredDeps(ws.packageJson);

  const names = new Set<string>([
    ...Object.keys(localDeps),
    ...Object.keys(rootDeps),
  ]);

  const out: ResolvedDep[] = [];
  for (const name of names) {
    if (name === ws.name) continue;
    const localRange = localDeps[name];
    const rootRange = rootDeps[name];
    let source: DepSource;
    let range: string;
    if (workspaceNames.has(name)) {
      source = 'workspace';
      range = localRange ?? rootRange ?? '*';
    } else if (localRange !== undefined) {
      source = 'local';
      range = localRange;
    } else {
      source = 'root';
      range = rootRange!;
    }
    out.push({ name, range, source });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export interface DepConflict {
  name: string;
  rootRange: string;
  localRange: string;
  workspace: string;
}

export function findDepConflicts(root: Root): DepConflict[] {
  const rootDeps = declaredDeps(root.packageJson);
  const conflicts: DepConflict[] = [];
  for (const ws of root.workspaces) {
    const localDeps = declaredDeps(ws.packageJson);
    for (const [name, localRange] of Object.entries(localDeps)) {
      const rootRange = rootDeps[name];
      if (rootRange !== undefined && rootRange !== localRange) {
        conflicts.push({
          name,
          rootRange,
          localRange,
          workspace: ws.name,
        });
      }
    }
  }
  return conflicts;
}
