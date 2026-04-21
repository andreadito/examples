import { list } from './commands/list.js';
import { graph } from './commands/graph.js';
import { check } from './commands/check.js';
import { run } from './commands/run.js';
import { init } from './commands/init.js';
import { why } from './commands/why.js';
import { syncTsconfig } from './commands/sync.js';
import { affectedCmd } from './commands/affected.js';
import { cacheClear, cacheInfo } from './commands/cache.js';
import { resolveRef } from './git.js';

const HELP = `tsmono — a tiny TypeScript monorepo helper

Layout:
  root/
    package.json            shared (global) deps
    tsconfig.base.json
    apps/<name>/package.json       app-local deps + scripts
    packages/<name>/package.json   package-local deps + scripts

Commands:
  tsmono init [dir]                scaffold a monorepo (root, apps/, packages/)
  tsmono list                      list all workspaces
  tsmono graph [--json]            print the workspace dependency graph
  tsmono check                     detect circular deps and version conflicts
  tsmono run <script> [flags]      run <script> in each workspace, in topo order
      --only A,B                      restrict to the listed workspaces
      --affected [--base REF]         only run in workspaces affected since REF
                                      (default: origin/main, falls back to main)
      --untracked                     include untracked files in --affected
      --no-cache                      disable output caching
      --force                         ignore cache hits (re-run and overwrite)
  tsmono affected [--base REF] [--json]   list workspaces affected since REF
  tsmono why <workspace>           show a workspace's deps grouped by source
  tsmono sync-tsconfig [--check]   sync tsconfig project references to the workspace graph
  tsmono cache info                show cached entries with sizes
  tsmono cache clear               delete the local cache dir
  tsmono --help                    show this help

Exit codes:
  0   success
  1   cycle / conflict / script failure
  2   usage error
`;

export function main(argv: string[]): number {
  const [cmd, ...rest] = argv;
  const cwd = process.cwd();
  switch (cmd) {
    case undefined:
    case '-h':
    case '--help':
    case 'help':
      process.stdout.write(HELP);
      return 0;
    case 'init':
      return init(cwd, rest[0]);
    case 'list':
    case 'ls':
      return list(cwd);
    case 'graph':
      return graph(cwd, { json: rest.includes('--json') });
    case 'check':
      return check(cwd);
    case 'run': {
      const [script, ...opts] = rest;
      if (!script) {
        console.error('usage: tsmono run <script> [--only a,b] [--affected [--base REF] [--untracked]]');
        return 2;
      }
      const onlyIdx = opts.indexOf('--only');
      const filter =
        onlyIdx >= 0 && opts[onlyIdx + 1]
          ? opts[onlyIdx + 1]!.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;
      const affected = opts.includes('--affected')
        ? {
            base: pickBase(opts, cwd),
            includeUntracked: opts.includes('--untracked'),
          }
        : undefined;
      return run(cwd, script, {
        filter,
        affected,
        noCache: opts.includes('--no-cache'),
        force: opts.includes('--force'),
      });
    }
    case 'affected': {
      return affectedCmd(cwd, {
        base: pickBase(rest, cwd),
        includeUntracked: rest.includes('--untracked'),
        json: rest.includes('--json'),
      });
    }
    case 'why': {
      const name = rest[0];
      if (!name) {
        console.error('usage: tsmono why <workspace-name>');
        return 2;
      }
      return why(cwd, name);
    }
    case 'sync-tsconfig':
      return syncTsconfig(cwd, { check: rest.includes('--check') });
    case 'cache': {
      const sub = rest[0];
      if (sub === 'clear') return cacheClear(cwd);
      if (sub === 'info' || sub === undefined) return cacheInfo(cwd);
      console.error('usage: tsmono cache [info|clear]');
      return 2;
    }
    default:
      console.error(`unknown command: ${cmd}`);
      process.stdout.write(HELP);
      return 2;
  }
}

function pickBase(args: string[], cwd: string): string {
  const i = args.indexOf('--base');
  if (i >= 0 && args[i + 1]) return args[i + 1]!;
  for (const candidate of ['origin/main', 'main', 'HEAD~1']) {
    if (resolveRef(cwd, candidate)) return candidate;
  }
  return 'HEAD';
}

export function runCli(): void {
  try {
    const code = main(process.argv.slice(2));
    process.exit(code);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`tsmono: ${msg}`);
    process.exit(1);
  }
}
