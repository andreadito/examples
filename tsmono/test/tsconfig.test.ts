import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadRoot } from '../src/workspace.js';
import { planTsconfigs, applyTsconfigPlans } from '../src/tsconfig.js';
import { parseJsonc } from '../src/jsonc.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', '..', 'test', 'fixtures');

describe('parseJsonc', () => {
  it('strips // and /* */ comments and trailing commas', () => {
    const src = `{
      // leading comment
      "a": 1, /* inline */
      "b": [1, 2, 3,], // trailing
    }`;
    assert.deepEqual(parseJsonc(src), { a: 1, b: [1, 2, 3] });
  });
  it('leaves // inside strings alone', () => {
    assert.deepEqual(parseJsonc('{"url": "https://example.com"}'), {
      url: 'https://example.com',
    });
  });
});

describe('planTsconfigs', () => {
  let tmpRoot: string;

  before(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'tsmono-'));
    mkdirSync(join(tmpRoot, 'apps', 'web'), { recursive: true });
    mkdirSync(join(tmpRoot, 'packages', 'ui'), { recursive: true });
    mkdirSync(join(tmpRoot, 'packages', 'utils'), { recursive: true });
    writeFileSync(
      join(tmpRoot, 'package.json'),
      JSON.stringify({ name: 't', private: true, workspaces: ['apps/*', 'packages/*'] }),
    );
    writeFileSync(
      join(tmpRoot, 'tsconfig.base.json'),
      JSON.stringify({ compilerOptions: { strict: true } }),
    );
    writeFileSync(
      join(tmpRoot, 'apps', 'web', 'package.json'),
      JSON.stringify({ name: '@t/web', dependencies: { '@t/ui': '*', '@t/utils': '*' } }),
    );
    writeFileSync(
      join(tmpRoot, 'packages', 'ui', 'package.json'),
      JSON.stringify({ name: '@t/ui', dependencies: { '@t/utils': '*' } }),
    );
    writeFileSync(
      join(tmpRoot, 'packages', 'utils', 'package.json'),
      JSON.stringify({ name: '@t/utils' }),
    );
  });

  after(() => rmSync(tmpRoot, { recursive: true, force: true }));

  it('creates tsconfig with composite + correct references', () => {
    const plans = planTsconfigs(loadRoot(tmpRoot));
    const web = plans.find((p) => p.workspace === '@t/web')!;

    assert.equal(web.created, true);
    const after = web.after as { compilerOptions: { composite: boolean }; references: { path: string }[] };
    assert.equal(after.compilerOptions.composite, true);
    assert.deepEqual(after.references.map((r) => r.path).sort(), [
      '../../packages/ui',
      '../../packages/utils',
    ]);

    const utils = plans.find((p) => p.workspace === '@t/utils')!;
    assert.equal('references' in (utils.after as object), false, 'no deps → no references');
  });

  it('preserves unrelated fields when updating', () => {
    writeFileSync(
      join(tmpRoot, 'packages', 'utils', 'tsconfig.json'),
      JSON.stringify({
        extends: '../../tsconfig.base.json',
        compilerOptions: { strict: true, outDir: 'dist' },
        include: ['src/**/*'],
      }),
    );
    const plans = planTsconfigs(loadRoot(tmpRoot));
    const utils = plans.find((p) => p.workspace === '@t/utils')!;
    const after = utils.after as {
      extends: string;
      compilerOptions: { strict: boolean; outDir: string; composite: boolean };
      include: string[];
    };
    assert.equal(after.compilerOptions.strict, true);
    assert.equal(after.compilerOptions.outDir, 'dist');
    assert.equal(after.compilerOptions.composite, true);
    assert.deepEqual(after.include, ['src/**/*']);
  });

  it('reports no change once written and re-planned', () => {
    const plans = planTsconfigs(loadRoot(tmpRoot));
    applyTsconfigPlans(plans);
    const replan = planTsconfigs(loadRoot(tmpRoot));
    assert.deepEqual(
      replan.filter((p) => p.changed).map((p) => p.workspace),
      [],
    );
    // sanity: the files actually exist now
    for (const p of plans) assert.ok(existsSync(p.path));
    // and parse as JSON
    for (const p of plans) parseJsonc(readFileSync(p.path, 'utf8'));
  });
});
