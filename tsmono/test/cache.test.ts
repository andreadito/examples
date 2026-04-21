import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { loadRoot } from '../src/workspace.js';
import { buildGraph } from '../src/graph.js';
import {
  cacheKey,
  makeEntry,
  cacheHit,
  storeCache,
  restoreCache,
  workspaceOutputs,
  cacheRootDir,
  clearCache,
} from '../src/cache.js';

const describeFixture = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'tsmono-cache-'));
  mkdirSync(join(dir, 'packages', 'lib', 'src'), { recursive: true });
  mkdirSync(join(dir, 'packages', 'lib', 'dist'), { recursive: true });
  mkdirSync(join(dir, 'apps', 'app', 'src'), { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'r', private: true, workspaces: ['apps/*', 'packages/*'] }),
  );
  writeFileSync(
    join(dir, 'packages', 'lib', 'package.json'),
    JSON.stringify({
      name: '@t/lib',
      scripts: { build: 'echo lib' },
      tsmono: { outputs: { build: ['dist'] } },
    }),
  );
  writeFileSync(
    join(dir, 'packages', 'lib', 'src', 'index.ts'),
    'export const x = 1;\n',
  );
  writeFileSync(
    join(dir, 'packages', 'lib', 'dist', 'index.js'),
    'exports.x = 1;\n',
  );
  writeFileSync(
    join(dir, 'apps', 'app', 'package.json'),
    JSON.stringify({
      name: '@t/app',
      scripts: { build: 'echo app' },
      dependencies: { '@t/lib': '*' },
      tsmono: { outputs: { build: ['dist'] } },
    }),
  );
  writeFileSync(
    join(dir, 'apps', 'app', 'src', 'main.ts'),
    'import { x } from "@t/lib";\n',
  );
  return dir;
};

describe('workspaceOutputs', () => {
  it('reads from tsmono.outputs and rejects unsafe paths', () => {
    const tmp = describeFixture();
    try {
      const root = loadRoot(tmp);
      const lib = root.workspaces.find((w) => w.name === '@t/lib')!;
      assert.deepEqual(workspaceOutputs(lib, 'build'), ['dist']);
      assert.deepEqual(workspaceOutputs(lib, 'test'), []);

      lib.packageJson.tsmono = { outputs: { build: ['../escape', '/abs', 'dist'] } };
      assert.deepEqual(workspaceOutputs(lib, 'build'), ['dist']);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('cacheKey', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = describeFixture();
  });
  after(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  it('is stable across reads of the same state', () => {
    const root = loadRoot(tmp);
    const g = buildGraph(root);
    const lib = root.workspaces.find((w) => w.name === '@t/lib')!;
    const k1 = cacheKey(root, g, lib, 'build');
    const k2 = cacheKey(root, g, lib, 'build');
    assert.equal(k1, k2);
  });

  it('changes when source changes', () => {
    const root = loadRoot(tmp);
    const g = buildGraph(root);
    const lib = root.workspaces.find((w) => w.name === '@t/lib')!;
    const before = cacheKey(root, g, lib, 'build');
    writeFileSync(join(lib.dir, 'src', 'index.ts'), 'export const x = 2;\n');
    const after = cacheKey(root, g, lib, 'build');
    assert.notEqual(before, after);
  });

  it('ignores files inside declared outputs', () => {
    const root = loadRoot(tmp);
    const g = buildGraph(root);
    const lib = root.workspaces.find((w) => w.name === '@t/lib')!;
    const before = cacheKey(root, g, lib, 'build');
    writeFileSync(join(lib.dir, 'dist', 'new-artifact.js'), 'anything\n');
    const after = cacheKey(root, g, lib, 'build');
    assert.equal(before, after, 'output changes must not invalidate own key');
  });

  it("cascades: changing a dep's source changes the dependent's key", () => {
    const root = loadRoot(tmp);
    const g = buildGraph(root);
    const lib = root.workspaces.find((w) => w.name === '@t/lib')!;
    const app = root.workspaces.find((w) => w.name === '@t/app')!;
    const before = cacheKey(root, g, app, 'build');
    writeFileSync(join(lib.dir, 'src', 'index.ts'), 'export const x = 99;\n');
    const after = cacheKey(root, g, app, 'build');
    assert.notEqual(before, after);
  });
});

describe('store + restore', () => {
  let tmp: string;
  before(() => {
    tmp = describeFixture();
  });
  after(() => rmSync(tmp, { recursive: true, force: true }));

  it('round-trips outputs through the cache', () => {
    const root = loadRoot(tmp);
    const g = buildGraph(root);
    const lib = root.workspaces.find((w) => w.name === '@t/lib')!;
    const key = cacheKey(root, g, lib, 'build');
    const entry = makeEntry(root, key, ['dist']);
    assert.equal(cacheHit(entry), false);

    storeCache(lib, entry, 'build');
    assert.equal(cacheHit(entry), true);

    // wipe output, restore, verify contents
    rmSync(join(lib.dir, 'dist'), { recursive: true, force: true });
    assert.equal(existsSync(join(lib.dir, 'dist')), false);

    restoreCache(lib, entry);
    assert.equal(
      readFileSync(join(lib.dir, 'dist', 'index.js'), 'utf8'),
      'exports.x = 1;\n',
    );

    clearCache(root);
    assert.equal(existsSync(cacheRootDir(root)), false);
  });
});
