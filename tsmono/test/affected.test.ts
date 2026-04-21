import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadRoot } from '../src/workspace.js';
import { buildGraph } from '../src/graph.js';
import { computeAffected } from '../src/affected.js';

const here = dirname(fileURLToPath(import.meta.url));
const basic = join(here, '..', '..', 'test', 'fixtures', 'basic');

describe('computeAffected', () => {
  it('attributes a changed file to its workspace and marks dependents', () => {
    const root = loadRoot(basic);
    const g = buildGraph(root);
    const r = computeAffected(root, g, ['packages/utils/src/index.ts']);

    assert.deepEqual([...r.directlyChanged].sort(), ['@fixture/utils']);
    // utils → ui → web: all three should be affected
    assert.deepEqual(
      [...r.affected].sort(),
      ['@fixture/ui', '@fixture/utils', '@fixture/web'],
    );
    assert.equal(r.globalChange, false);
  });

  it('only marks downstream, not upstream', () => {
    const root = loadRoot(basic);
    const g = buildGraph(root);
    const r = computeAffected(root, g, ['apps/web/src/main.tsx']);

    assert.deepEqual([...r.directlyChanged], ['@fixture/web']);
    assert.deepEqual([...r.affected], ['@fixture/web']);
  });

  it('treats root-level files as a global change', () => {
    const root = loadRoot(basic);
    const g = buildGraph(root);
    const r = computeAffected(root, g, ['package.json']);

    assert.equal(r.globalChange, true);
    assert.equal(r.affected.size, 3);
  });

  it('treats tsconfig.base.json as a global change', () => {
    const root = loadRoot(basic);
    const g = buildGraph(root);
    const r = computeAffected(root, g, ['tsconfig.base.json']);
    assert.equal(r.globalChange, true);
  });

  it('collects unattributed paths without marking anything affected', () => {
    const root = loadRoot(basic);
    const g = buildGraph(root);
    const r = computeAffected(root, g, ['docs/README.md', 'tools/ci.sh']);

    assert.equal(r.globalChange, false);
    assert.equal(r.affected.size, 0);
    assert.deepEqual(r.unattributed, ['docs/README.md', 'tools/ci.sh']);
  });
});
