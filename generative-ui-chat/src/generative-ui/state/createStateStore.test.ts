import { describe, it, expect } from 'vitest';
import { createStateStore } from './createStateStore';
import { createJotaiStore } from './jotaiStore';
import { createXStateStore } from './xstateStore';
import { getStoreMeta } from './storeMeta';
import { diffSnapshots } from '../debugUtils';

describe('createStateStore', () => {
  it('hydrates a jotai store from a serializable config (default engine)', () => {
    const store = createStateStore({ initialState: { flow: { step: 'idle' } } });
    expect(store.get('/flow/step')).toBe('idle');
    expect(getStoreMeta(store)).toEqual({ engine: 'jotai', initialState: { flow: { step: 'idle' } } });
  });

  it('hydrates an xstate store when configured', () => {
    const store = createStateStore({ engine: 'xstate', initialState: { ticket: { qty: 100 } } });
    expect(store.get('/ticket/qty')).toBe(100);
    expect(getStoreMeta(store)?.engine).toBe('xstate');
  });

  it('round-trips: config + snapshot rebuild identical state on either engine', () => {
    const original = createStateStore({ engine: 'jotai', initialState: { flow: { step: 'idle' } } });
    original.set('/ticket', { symbol: 'AAPL', qty: 250 });
    const persisted = { config: { engine: 'xstate' as const }, snapshot: original.getSnapshot() };

    const restored = createStateStore({ ...persisted.config, initialState: persisted.snapshot });
    expect(restored.getSnapshot()).toEqual(original.getSnapshot());
  });

  it('meta initialState is a snapshot of creation time, immune to later writes', () => {
    const store = createJotaiStore({ flow: { step: 'idle' } });
    store.set('/flow/step', 'review');
    expect(getStoreMeta(store)?.initialState).toEqual({ flow: { step: 'idle' } });
    expect(store.get('/flow/step')).toBe('review');
  });

  it('tags both factory engines; foreign stores have no meta', () => {
    expect(getStoreMeta(createJotaiStore())?.engine).toBe('jotai');
    expect(getStoreMeta(createXStateStore())?.engine).toBe('xstate');
    const foreign = { get: () => undefined, set: () => {}, update: () => {}, getSnapshot: () => ({}), subscribe: () => () => {} };
    expect(getStoreMeta(foreign as never)).toBeUndefined();
  });
});

describe('diffSnapshots', () => {
  it('reports leaf changes with old and new values', () => {
    const changes = diffSnapshots({ ticket: { qty: 100, symbol: 'AAPL' } }, { ticket: { qty: 250, symbol: 'AAPL' } });
    expect(changes).toEqual([{ path: '/ticket/qty', from: 100, to: 250 }]);
  });

  it('reports added and removed paths', () => {
    expect(diffSnapshots({}, { pnlThreshold: 500 })).toEqual([{ path: '/pnlThreshold', from: undefined, to: 500 }]);
    expect(diffSnapshots({ a: 1 }, {})).toEqual([{ path: '/a', from: 1, to: undefined }]);
  });

  it('summarizes array churn instead of diffing rows', () => {
    const changes = diffSnapshots({ data: { rows: [{ a: 1 }] } }, { data: { rows: [{ a: 2 }, { a: 3 }] } });
    expect(changes).toEqual([{ path: '/data/rows', from: '[1 items]', to: '[2 items]' }]);
  });

  it('returns nothing for identical snapshots and respects the cap', () => {
    expect(diffSnapshots({ a: 1 }, { a: 1 })).toEqual([]);
    const wide = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i]));
    expect(diffSnapshots({}, wide, 10)).toHaveLength(10);
  });
});
