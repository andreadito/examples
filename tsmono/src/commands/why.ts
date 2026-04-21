import { loadRoot } from '../workspace.js';
import { resolveDeps } from '../deps.js';

export function why(cwd: string, workspaceName: string): number {
  const root = loadRoot(cwd);
  const ws = root.workspaces.find((w) => w.name === workspaceName);
  if (!ws) {
    console.error(`No workspace named "${workspaceName}"`);
    return 1;
  }
  const resolved = resolveDeps(root, ws);
  console.log(`${ws.name} [${ws.kind}] — ${resolved.length} deps`);
  const groups = {
    workspace: resolved.filter((d) => d.source === 'workspace'),
    local: resolved.filter((d) => d.source === 'local'),
    root: resolved.filter((d) => d.source === 'root'),
  };
  section('workspace', groups.workspace);
  section('local', groups.local);
  section('root (inherited)', groups.root);
  return 0;
}

function section(
  label: string,
  deps: { name: string; range: string }[],
): void {
  if (deps.length === 0) return;
  console.log(`\n${label}:`);
  const width = Math.max(...deps.map((d) => d.name.length));
  for (const d of deps) {
    console.log(`  ${d.name.padEnd(width)}  ${d.range}`);
  }
}
