import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildCatalog } from './buildCatalog';
import { defineCatalogComponent } from './extension';

// NOTE on `visible`: @json-render/react's `schema` declares each element's
// `visible` field via the schema builder's `s.any()`, which compiles to a
// plain (non-optional) `z.any()`. In Zod v4, a non-optional field must be
// *present* on the object even though `z.any()` accepts any value including
// `undefined` — omitting the key entirely fails with
// `{ code: 'invalid_type', expected: 'nonoptional' }`. So every element in a
// spec must include an explicit `visible` key (e.g. `visible: null`). See
// definitions.ts for the full writeup of this and the related `$state`
// finding, since both gate how later tasks assemble/patch specs.
const goodSpec = {
  root: 'stack-1',
  elements: {
    'stack-1': {
      type: 'Stack',
      props: { direction: 'column', gap: 2, wrap: null, sx: null },
      children: ['stat-1'],
      visible: null,
    },
    'stat-1': {
      type: 'StatTile',
      props: { label: 'Total P&L', value: { $state: '/data/totalPnl' }, format: 'currency', delta: null, color: 'success', sx: null },
      children: [],
      visible: null,
    },
  },
};

describe('buildCatalog', () => {
  it('validates a known-good spec', () => {
    const catalog = buildCatalog();
    const result = catalog.validate(goodSpec);
    expect(result.success).toBe(true);
  });

  it('rejects a spec with an unknown component type', () => {
    const catalog = buildCatalog();
    const bad = { root: 'x', elements: { x: { type: 'Iframe', props: {}, children: [], visible: null } } };
    expect(catalog.validate(bad).success).toBe(false);
  });

  it('exports a JSON schema object usable as a tool input_schema', () => {
    const schema = buildCatalog().jsonSchema() as Record<string, unknown>;
    expect(schema).toBeTypeOf('object');
    expect(JSON.stringify(schema)).toContain('elements');
  });

  it('generates a prompt mentioning components and transforms', () => {
    const prompt = buildCatalog().prompt({ customRules: ['RULE_MARKER_XYZ'] });
    expect(prompt).toContain('StatTile');
    expect(prompt).toContain('aggregateBy');
    expect(prompt).toContain('RULE_MARKER_XYZ');
  });

  it('merges extensions into catalog validation and prompt', () => {
    const ext = defineCatalogComponent({
      type: 'MyWidget',
      definition: { props: z.object({ label: z.string() }), description: 'Test widget' },
      component: () => null,
    });
    const catalog = buildCatalog([ext]);
    const spec = { root: 'w', elements: { w: { type: 'MyWidget', props: { label: 'hi' }, children: [], visible: null } } };
    expect(catalog.validate(spec).success).toBe(true);
    expect(catalog.prompt()).toContain('MyWidget');
  });
});
