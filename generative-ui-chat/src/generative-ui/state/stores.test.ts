import { describe, it, expect, vi } from 'vitest';
import { createJotaiStore } from './jotaiStore';
import { createXStateStore } from './xstateStore';

describe.each([
  ['jotai', createJotaiStore],
  ['xstate', createXStateStore],
])('%s state store', (_name, createStore) => {
  it('get/set round-trips JSON Pointer paths and notifies subscribers', () => {
    const store = createStore({ data: { positions: [] } });
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.set('/data/positions', [{ symbol: 'AAPL' }]);
    expect(store.get('/data/positions')).toEqual([{ symbol: 'AAPL' }]);
    expect(listener).toHaveBeenCalled();
    unsub();
  });

  it('getSnapshot returns the full model', () => {
    const store = createStore({ a: 1 });
    store.set('/b', 2);
    expect(store.getSnapshot()).toMatchObject({ a: 1, b: 2 });
  });
});
