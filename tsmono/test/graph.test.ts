import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadRoot } from '../src/workspace.js';
import { buildGraph, findCycles, topoOrder } from '../src/graph.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', '..', 'test', 'fixtures');

describe('buildGraph', () => {
  it('creates edges only for workspace-internal deps', () => {
    const root = loadRoot(join(fixtures, 'basic'));
    const g = buildGraph(root);

    assert.deepEqual(
      [...g.edges.get('@fixture/utils')!].sort(),
      [],
      'utils has only external deps (zod)',
    );
    assert.deepEqual(
      [...g.edges.get('@fixture/ui')!].sort(),
      ['@fixture/utils'],
    );
    assert.deepEqual(
      [...g.edges.get('@fixture/web')!].sort(),
      ['@fixture/ui', '@fixture/utils'],
    );
  });
});

describe('findCycles', () => {
  it('returns [] for an acyclic graph', () => {
    const root = loadRoot(join(fixtures, 'basic'));
    const cycles = findCycles(buildGraph(root));
    assert.deepEqual(cycles, []);
  });

  it('detects a simple 2-node cycle exactly once', () => {
    const root = loadRoot(join(fixtures, 'cycle'));
    const cycles = findCycles(buildGraph(root));
    assert.equal(cycles.length, 1);
    const names = new Set(cycles[0]!);
    assert.ok(names.has('@cycle/a'));
    assert.ok(names.has('@cycle/b'));
    assert.equal(cycles[0]![0], cycles[0]![cycles[0]!.length - 1], 'cycle should be closed');
  });
});

describe('topoOrder', () => {
  it('places dependencies before their dependents', () => {
    const root = loadRoot(join(fixtures, 'basic'));
    const order = topoOrder(buildGraph(root));
    assert.ok(order.indexOf('@fixture/utils') < order.indexOf('@fixture/ui'));
    assert.ok(order.indexOf('@fixture/ui') < order.indexOf('@fixture/web'));
    assert.ok(order.indexOf('@fixture/utils') < order.indexOf('@fixture/web'));
  });

  it('throws on cyclic graphs', () => {
    const root = loadRoot(join(fixtures, 'cycle'));
    assert.throws(() => topoOrder(buildGraph(root)), /cycle/i);
  });
});
