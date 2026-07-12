import type { StateStore } from './types';
import { createJotaiStore } from './jotaiStore';
import { createXStateStore } from './xstateStore';

/**
 * A fully serializable description of a component's state management —
 * plain JSON, so it can be persisted next to the spec and hydrated later.
 * This makes the third document of a stored dashboard/flow:
 *
 *   { spec, stateConfig, snapshot? }
 *
 * A dev authors spec + stateConfig once; the platform stores them; any
 * runtime (including one serving readonly users) rebuilds the exact same
 * state engine with `createStateStore(stateConfig)` — optionally seeding it
 * with a saved snapshot instead of the pristine initialState.
 */
export interface StateStoreConfig {
  /** Which engine backs the store. @default 'jotai' */
  engine?: 'jotai' | 'xstate';
  /** State the store starts with (flow steps, ticket defaults, ...). @default {} */
  initialState?: Record<string, unknown>;
}

export function createStateStore(config: StateStoreConfig = {}): StateStore {
  const { engine = 'jotai', initialState = {} } = config;
  return engine === 'xstate' ? createXStateStore(initialState) : createJotaiStore(initialState);
}
