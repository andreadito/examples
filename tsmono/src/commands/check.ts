import { loadRoot } from '../workspace.js';
import { buildGraph, findCycles } from '../graph.js';
import { findDepConflicts } from '../deps.js';

export function check(cwd: string): number {
  const root = loadRoot(cwd);
  const g = buildGraph(root);
  const cycles = findCycles(g);
  const conflicts = findDepConflicts(root);

  let ok = true;

  if (cycles.length > 0) {
    ok = false;
    console.error(
      `FAIL: ${cycles.length} circular dependenc${cycles.length === 1 ? 'y' : 'ies'} detected:`,
    );
    for (const cycle of cycles) {
      console.error('  ' + cycle.join(' -> '));
    }
  }

  if (conflicts.length > 0) {
    ok = false;
    console.error(
      `FAIL: ${conflicts.length} dependency version conflict${conflicts.length === 1 ? '' : 's'} between root and workspaces:`,
    );
    for (const c of conflicts) {
      console.error(
        `  ${c.name}: root "${c.rootRange}" vs ${c.workspace} "${c.localRange}"`,
      );
    }
  }

  if (ok) {
    console.log(
      `OK: ${g.nodes.size} workspace${g.nodes.size === 1 ? '' : 's'}, no circular dependencies, no version conflicts`,
    );
    return 0;
  }
  return 1;
}
