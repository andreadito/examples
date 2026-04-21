import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadRoot } from '../src/workspace.js';

const here = dirname(fileURLToPath(import.meta.url));
const basic = join(here, '..', '..', 'test', 'fixtures', 'basic');

describe('loadRoot', () => {
  it('discovers apps and packages', () => {
    const root = loadRoot(basic);
    const names = root.workspaces.map((w) => w.name).sort();
    assert.deepEqual(names, ['@fixture/ui', '@fixture/utils', '@fixture/web']);

    const web = root.workspaces.find((w) => w.name === '@fixture/web')!;
    assert.equal(web.kind, 'app');

    const utils = root.workspaces.find((w) => w.name === '@fixture/utils')!;
    assert.equal(utils.kind, 'package');
  });

  it('throws on a missing root package.json', () => {
    assert.throws(() => loadRoot(join(here, 'does-not-exist')));
  });
});
