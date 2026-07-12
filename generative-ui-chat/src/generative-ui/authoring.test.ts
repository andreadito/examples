import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createAuthoringContext, createSpecValidator } from './authoring';
import { defineCatalogComponent } from './catalog/extension';

describe('createAuthoringContext', () => {
  it('packages catalog instructions, spec schema, and data shape', () => {
    const ctx = createAuthoringContext({
      data: { orders: [{ symbol: 'AAPL', qty: 100 }] },
      dataDescription: 'Open orders',
    });
    expect(ctx.instructions).toContain('StatTile');
    expect(ctx.instructions).toContain('AdvancedGrid');
    expect(ctx.instructions).toContain('visible');
    expect(ctx.instructions).toContain('/data/orders');
    expect(ctx.dataInfo).toContain('Open orders');
    expect(ctx.dataInfo).toContain('symbol: string');
    expect(JSON.stringify(ctx.specSchema)).toContain('elements');
    // Document dialect, not json-render's streaming JSONL/patch dialect.
    expect(ctx.instructions).toContain('COMPLETE spec document');
    expect(ctx.instructions).not.toContain('JSONL patches');
    expect(ctx.instructions).not.toContain('RFC 6902');
  });

  it('includes host extensions in the instructions', () => {
    const gauge = defineCatalogComponent({
      type: 'RiskGauge',
      definition: { props: z.object({ value: z.number() }), description: 'Radial risk gauge.' },
      component: () => null,
    });
    const ctx = createAuthoringContext({ extensions: [gauge] });
    expect(ctx.instructions).toContain('RiskGauge');
  });
});

describe('createSpecValidator', () => {
  const validate = createSpecValidator();

  it('accepts and normalizes a hand-written spec (missing visible/children filled in)', () => {
    const result = validate({
      root: 't',
      elements: { t: { type: 'StatTile', props: { label: 'PnL', value: 5 } } },
    });
    expect(result.success).toBe(true);
    const element = (result.spec as { elements: Record<string, { visible: unknown; children: unknown[] }> }).elements.t;
    expect(element.visible).toBe(true);
    expect(element.children).toEqual([]);
  });

  it('rejects unknown component types with readable errors', () => {
    const result = validate({ root: 'x', elements: { x: { type: 'Bogus', props: {}, children: [] } } });
    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('elements.x.type');
    expect(result.spec).toBeNull();
  });

  it('rejects bad prop values with the offending path', () => {
    const result = validate({
      root: 't',
      elements: { t: { type: 'StatTile', props: { label: 42, value: 5 }, children: [] } },
    });
    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('label');
  });
});
