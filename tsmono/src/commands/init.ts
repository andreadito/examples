import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function init(cwd: string, target?: string): number {
  const dir = resolve(cwd, target ?? '.');
  ensureDir(dir);
  ensureDir(join(dir, 'apps'));
  ensureDir(join(dir, 'packages'));

  writeIfAbsent(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'my-monorepo',
        private: true,
        workspaces: ['apps/*', 'packages/*'],
        scripts: {
          build: 'tsmono run build',
          check: 'tsmono check',
        },
      },
      null,
      2,
    ) + '\n',
  );

  writeIfAbsent(
    join(dir, 'tsconfig.base.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          declaration: true,
        },
      },
      null,
      2,
    ) + '\n',
  );

  writeIfAbsent(join(dir, '.gitignore'), ['node_modules', 'dist', ''].join('\n'));

  writeIfAbsent(
    join(dir, 'apps', '.gitkeep'),
    '',
  );
  writeIfAbsent(
    join(dir, 'packages', '.gitkeep'),
    '',
  );

  console.log(`Initialized monorepo at ${dir}`);
  console.log('Next steps:');
  console.log('  1. Add an app under   apps/<name>/package.json');
  console.log('  2. Add a package under packages/<name>/package.json');
  console.log('  3. Run `tsmono list` / `tsmono graph` / `tsmono check`');
  return 0;
}

function ensureDir(p: string): void {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function writeIfAbsent(p: string, content: string): void {
  if (!existsSync(p)) writeFileSync(p, content);
}
