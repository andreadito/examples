import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadRoot } from '../src/workspace.js';
import { resolveDeps, findDepConflicts } from '../src/deps.js';

const here = dirname(fileURLToPath(import.meta.url));
const basic = join(here, '..', '..', 'test', 'fixtures', 'basic');

describe('resolveDeps', () => {
  it('classifies workspace, local, and root deps', () => {
    const root = loadRoot(basic);
    const web = root.workspaces.find((w) => w.name === '@fixture/web')!;
    const resolved = resolveDeps(root, web);
    const byName = Object.fromEntries(resolved.map((d) => [d.name, d]));

    assert.equal(byName['@fixture/ui']!.source, 'workspace');
    assert.equal(byName['@fixture/utils']!.source, 'workspace');
    assert.equal(byName['react']!.source, 'local');
    assert.equal(byName['zod']!.source, 'root', 'zod declared at root, inherited');
  });

  it('inherits root deps into a workspace that does not redeclare them', () => {
    const root = loadRoot(basic);
    const ui = root.workspaces.find((w) => w.name === '@fixture/ui')!;
    const zod = resolveDeps(root, ui).find((d) => d.name === 'zod');
    assert.ok(zod);
    assert.equal(zod.source, 'root');
  });
});

describe('findDepConflicts', () => {
  it('finds none for the basic fixture', () => {
    const root = loadRoot(basic);
    assert.deepEqual(findDepConflicts(root), []);
  });
});
