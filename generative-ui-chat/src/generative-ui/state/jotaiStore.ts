import { atom, createStore } from 'jotai';
import { jotaiStateStore } from '@json-render/jotai';
import type { StateStore } from '@json-render/core';
import { cloneInitialState, tagStore } from './storeMeta';

export function createJotaiStore(initialState: Record<string, unknown> = {}): StateStore {
  const uiAtom = atom<Record<string, unknown>>(initialState);
  return tagStore(jotaiStateStore({ atom: uiAtom, store: createStore() }), {
    engine: 'jotai',
    initialState: cloneInitialState(initialState),
  });
}
