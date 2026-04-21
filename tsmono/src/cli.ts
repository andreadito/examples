import { list } from './commands/list.js';
import { graph } from './commands/graph.js';
import { check } from './commands/check.js';
import { run } from './commands/run.js';
import { init } from './commands/init.js';
import { why } from './commands/why.js';

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
  tsmono run <script> [--only A,B] run <script> in each workspace, in topo order
  tsmono why <workspace>           show a workspace's deps grouped by source
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
        console.error('usage: tsmono run <script> [--only a,b]');
        return 2;
      }
      const onlyIdx = opts.indexOf('--only');
      const filter =
        onlyIdx >= 0 && opts[onlyIdx + 1]
          ? opts[onlyIdx + 1]!.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;
      return run(cwd, script, { filter });
    }
    case 'why': {
      const name = rest[0];
      if (!name) {
        console.error('usage: tsmono why <workspace-name>');
        return 2;
      }
      return why(cwd, name);
    }
    default:
      console.error(`unknown command: ${cmd}`);
      process.stdout.write(HELP);
      return 2;
  }
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
