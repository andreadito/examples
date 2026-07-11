import { describe, it, expect } from 'vitest';
import { buildCatalog } from '../catalog/buildCatalog';
import { createStrictValidator, mergedDefinitions } from './strictValidate';

const catalog = buildCatalog();
const validate = createStrictValidator(catalog, mergedDefinitions());

function statTileSpec(props: Record<string, unknown>) {
  return { root: 's', elements: { s: { type: 'StatTile', props, children: [], visible: true } } };
}

describe('createStrictValidator', () => {
  it('catches a garbage enum value on a known component prop (StatTile.format)', () => {
    const spec = statTileSpec({ label: 'PnL', value: 100, format: 'NOT_A_FORMAT', delta: null, color: null, sx: null });
    const result = validate(spec);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('format'))).toBe(true);
  });

  it('skips props whose value is an expression object, since those resolve at render time', () => {
    const spec = statTileSpec({
      label: 'PnL',
      value: { $state: '/data/totalPnl' },
      format: 'currency',
      delta: null,
      color: null,
      sx: null,
    });
    const result = validate(spec);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('catches an unknown prop key on an otherwise-known component', () => {
    const spec = statTileSpec({ label: 'PnL', value: 100, format: 'currency', delta: null, color: null, sx: null, bogus: 'nope' });
    const result = validate(spec);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('bogus'))).toBe(true);
  });

  it('catches an unknown component type (already rejected by the envelope check)', () => {
    const spec = { root: 'x', elements: { x: { type: 'NotAComponent', props: {}, children: [], visible: true } } };
    const result = validate(spec);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('passes a fully valid spec through untouched', () => {
    const spec = statTileSpec({ label: 'PnL', value: 100, format: 'currency', delta: 1.5, color: 'success', sx: null });
    const result = validate(spec);
    expect(result).toEqual({ success: true, errors: [] });
  });

  it('includes full path with array index in nested validation errors', () => {
    const spec = {
      root: 'sel-1',
      elements: {
        'sel-1': {
          type: 'Select',
          props: {
            label: 'Pick one',
            value: 'a',
            options: [
              { value: 'a', label: 'A' },
              { value: 'b' }, // missing required label at index 1
            ],
          },
          children: [],
          visible: true,
        },
      },
    };
    const result = validate(spec);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessages = result.errors.join(' | ');
    // Error should include element key, prop path (options), array index (1), and field name (label)
    expect(errorMessages).toMatch(/sel-1/);
    expect(errorMessages).toMatch(/options/);
    expect(errorMessages).toMatch(/\b1\b/);
    expect(errorMessages).toMatch(/label/);
  });
});
