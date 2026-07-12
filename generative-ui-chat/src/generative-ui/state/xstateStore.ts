import { createAtom } from '@xstate/store';
import { xstateStoreStateStore } from '@json-render/xstate';
import type { StateStore } from '@json-render/core';
import { cloneInitialState, tagStore } from './storeMeta';

export function createXStateStore(initialState: Record<string, unknown> = {}): StateStore {
  return tagStore(xstateStoreStateStore({ atom: createAtom(initialState) }), {
    engine: 'xstate',
    initialState: cloneInitialState(initialState),
  });
}
