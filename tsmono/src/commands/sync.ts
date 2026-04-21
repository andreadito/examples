import { relative } from 'node:path';
import { loadRoot } from '../workspace.js';
import { planTsconfigs, applyTsconfigPlans } from '../tsconfig.js';

export interface SyncOptions {
  check?: boolean;
}

export function syncTsconfig(cwd: string, opts: SyncOptions = {}): number {
  const root = loadRoot(cwd);
  const plans = planTsconfigs(root);
  const changed = plans.filter((p) => p.changed);

  if (changed.length === 0) {
    console.log('tsconfig: already in sync');
    return 0;
  }

  if (opts.check) {
    console.error(
      `FAIL: ${changed.length} tsconfig.json file${changed.length === 1 ? '' : 's'} out of sync:`,
    );
    for (const p of changed) {
      const rel = relative(root.dir, p.path);
      console.error(`  ${p.created ? 'missing' : 'drift'}: ${rel}  (${p.workspace})`);
    }
    console.error('\nRun `tsmono sync-tsconfig` to update them.');
    return 1;
  }

  const written = applyTsconfigPlans(plans);
  for (const p of changed) {
    const rel = relative(root.dir, p.path);
    console.log(`${p.created ? 'created' : 'updated'}: ${rel}`);
  }
  console.log(`\nWrote ${written} tsconfig.json file${written === 1 ? '' : 's'}`);
  return 0;
}
