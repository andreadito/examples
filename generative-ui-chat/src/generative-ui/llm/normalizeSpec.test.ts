import { describe, it, expect } from 'vitest';
import { normalizeSpec } from './normalizeSpec';

describe('normalizeSpec', () => {
  it('defaults an absent visible key to true', () => {
    const spec = { root: 'a', elements: { a: { type: 'Box', props: {} } } };
    const out = normalizeSpec(spec) as { elements: Record<string, { visible: unknown }> };
    expect(out.elements.a.visible).toBe(true);
  });

  it('converts a null visible key to true', () => {
    const spec = { root: 'a', elements: { a: { type: 'Box', props: {}, visible: null } } };
    const out = normalizeSpec(spec) as { elements: Record<string, { visible: unknown }> };
    expect(out.elements.a.visible).toBe(true);
  });

  it('preserves a real visibility condition object untouched', () => {
    const condition = { $state: '/data/showIt' };
    const spec = { root: 'a', elements: { a: { type: 'Box', props: {}, visible: condition } } };
    const out = normalizeSpec(spec) as { elements: Record<string, { visible: unknown }> };
    expect(out.elements.a.visible).toEqual(condition);
    expect(out.elements.a.visible).not.toBe(true);
  });

  it('defaults children to [] and props to {} when absent', () => {
    const spec = { root: 'a', elements: { a: { type: 'Box' } } };
    const out = normalizeSpec(spec) as { elements: Record<string, { children: unknown; props: unknown }> };
    expect(out.elements.a.children).toEqual([]);
    expect(out.elements.a.props).toEqual({});
  });

  it('leaves already-populated children/props alone', () => {
    const spec = { root: 'a', elements: { a: { type: 'Box', props: { sx: null }, children: ['b'], visible: true } } };
    const out = normalizeSpec(spec) as { elements: Record<string, { children: unknown; props: unknown }> };
    expect(out.elements.a.children).toEqual(['b']);
    expect(out.elements.a.props).toEqual({ sx: null });
  });

  it('passes non-object input through unchanged', () => {
    expect(normalizeSpec(null)).toBeNull();
    expect(normalizeSpec(undefined)).toBeUndefined();
    expect(normalizeSpec('not an object')).toBe('not an object');
    expect(normalizeSpec(42)).toBe(42);
    expect(normalizeSpec([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('passes objects without an elements map through unchanged', () => {
    const spec = { foo: 'bar' };
    expect(normalizeSpec(spec)).toEqual(spec);
  });
});
