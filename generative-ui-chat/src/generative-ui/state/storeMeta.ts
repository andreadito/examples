import type { StateStore } from './types';

/**
 * Engine metadata for a StateStore, attached at creation time. The
 * `StateStore` interface deliberately hides which engine backs it — great
 * for rendering, useless for debugging. The factories tag their stores here
 * so the inspector can show what a store IS (engine + the initial state it
 * was configured with), not just its current values. Stores built outside
 * our factories simply have no tag and report as 'custom'.
 */
export interface StateStoreMeta {
  engine: 'jotai' | 'xstate' | 'custom';
  /** Deep-cloned at creation — what the store was seeded with, immune to later mutation. */
  initialState: Record<string, unknown>;
}

const metaByStore = new WeakMap<object, StateStoreMeta>();

export function tagStore(store: StateStore, meta: StateStoreMeta): StateStore {
  metaByStore.set(store, meta);
  return store;
}

export function getStoreMeta(store: StateStore): StateStoreMeta | undefined {
  return metaByStore.get(store);
}

export function cloneInitialState(initialState: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(initialState)) as Record<string, unknown>;
  } catch {
    return {};
  }
}
