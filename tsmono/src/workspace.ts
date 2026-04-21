import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type WorkspaceKind = 'app' | 'package';

export interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface Workspace {
  name: string;
  kind: WorkspaceKind;
  dir: string;
  packageJson: PackageJson;
}

export interface Root {
  dir: string;
  packageJson: PackageJson;
  workspaces: Workspace[];
}

const WORKSPACE_ROOTS: Array<{ folder: string; kind: WorkspaceKind }> = [
  { folder: 'apps', kind: 'app' },
  { folder: 'packages', kind: 'package' },
];

export function loadRoot(rootDir: string): Root {
  const dir = resolve(rootDir);
  const rootPkgPath = join(dir, 'package.json');
  if (!existsSync(rootPkgPath)) {
    throw new Error(`No package.json at monorepo root: ${dir}`);
  }
  const packageJson = readJson(rootPkgPath);
  const workspaces: Workspace[] = [];
  const seen = new Map<string, string>();
  for (const { folder, kind } of WORKSPACE_ROOTS) {
    for (const ws of scanFolder(dir, folder, kind)) {
      const prev = seen.get(ws.name);
      if (prev) {
        throw new Error(
          `Duplicate workspace name "${ws.name}" in ${prev} and ${ws.dir}`,
        );
      }
      seen.set(ws.name, ws.dir);
      workspaces.push(ws);
    }
  }
  return { dir, packageJson, workspaces };
}

function scanFolder(
  root: string,
  folder: string,
  kind: WorkspaceKind,
): Workspace[] {
  const base = join(root, folder);
  if (!existsSync(base) || !statSync(base).isDirectory()) return [];
  const out: Workspace[] = [];
  for (const entry of readdirSync(base)) {
    const wsDir = join(base, entry);
    if (!statSync(wsDir).isDirectory()) continue;
    const pkgPath = join(wsDir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const packageJson = readJson(pkgPath);
    if (!packageJson.name) {
      throw new Error(`${pkgPath} is missing "name"`);
    }
    out.push({ name: packageJson.name, kind, dir: wsDir, packageJson });
  }
  return out;
}

function readJson(path: string): PackageJson {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read ${path}: ${msg}`);
  }
}

export function declaredDeps(pkg: PackageJson): Record<string, string> {
  return {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies,
  };
}
