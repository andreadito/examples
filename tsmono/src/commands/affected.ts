import { loadRoot } from '../workspace.js';
import { buildGraph } from '../graph.js';
import { changedFiles, resolveRef } from '../git.js';
import { computeAffected } from '../affected.js';

export interface AffectedCmdOptions {
  base: string;
  includeUntracked?: boolean;
  json?: boolean;
}

export function affectedCmd(cwd: string, opts: AffectedCmdOptions): number {
  const root = loadRoot(cwd);
  const g = buildGraph(root);

  if (!resolveRef(root.dir, opts.base)) {
    console.error(`Unknown git ref: ${opts.base}`);
    return 2;
  }

  const paths = changedFiles({
    cwd: root.dir,
    base: opts.base,
    includeUntracked: opts.includeUntracked,
  });
  const res = computeAffected(root, g, paths);

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          base: opts.base,
          globalChange: res.globalChange,
          directlyChanged: [...res.directlyChanged].sort(),
          affected: [...res.affected].sort(),
          unattributed: res.unattributed,
        },
        null,
        2,
      ),
    );
    return 0;
  }

  console.log(`base: ${opts.base}`);
  console.log(`changed files: ${paths.length}`);
  if (res.globalChange) {
    console.log('global change → all workspaces affected');
  }
  console.log(`\ndirectly changed (${res.directlyChanged.size}):`);
  for (const n of [...res.directlyChanged].sort()) console.log(`  ${n}`);
  console.log(`\naffected incl. dependents (${res.affected.size}):`);
  for (const n of [...res.affected].sort()) console.log(`  ${n}`);
  return 0;
}
