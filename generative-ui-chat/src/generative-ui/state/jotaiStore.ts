import { atom, createStore } from 'jotai';
import { jotaiStateStore } from '@json-render/jotai';
import type { StateStore } from '@json-render/core';

export function createJotaiStore(initialState: Record<string, unknown> = {}): StateStore {
  const uiAtom = atom<Record<string, unknown>>(initialState);
  return jotaiStateStore({ atom: uiAtom, store: createStore() });
}
