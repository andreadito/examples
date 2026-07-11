import { createAtom } from '@xstate/store';
import { xstateStoreStateStore } from '@json-render/xstate';
import type { StateStore } from '@json-render/core';

export function createXStateStore(initialState: Record<string, unknown> = {}): StateStore {
  return xstateStoreStateStore({ atom: createAtom(initialState) });
}
