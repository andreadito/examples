import { useEffect, useMemo, useRef } from 'react';
import { buildRuntime } from './catalog/buildRuntime';
import { financeExtensions } from './catalog/financeExtensions';
import type { CatalogExtension } from './catalog/extension';
import { createJotaiStore } from './state/jotaiStore';
import type { StateStore } from './state/types';
import { createStrictValidator, mergedDefinitions } from './llm/strictValidate';

export interface CanvasRuntimeArgs {
  data: Record<string, unknown>;
  stateStore?: StateStore;
  extensions?: CatalogExtension[];
  onEvent?: (name: string, payload?: Record<string, unknown>) => void;
  onStateChange?: (state: Record<string, unknown>) => void;
}

/**
 * Everything a canvas needs to render specs, independent of where the spec
 * comes from (LLM loop, host database, hand-written JSON): the pinned state
 * store with live /data injection, the compiled catalog runtime
 * (registry/handlers/transforms), the strict validator, and the action
 * handlers bound to the store. Shared by GenerativeUIChat and the headless
 * GenerativeUICanvas so both render specs identically.
 */
export function useCanvasRuntime({ data, stateStore, extensions, onEvent, onStateChange }: CanvasRuntimeArgs) {
  // Store: caller's or default jotai; stable for component lifetime.
  const storeRef = useRef<StateStore | undefined>(undefined);
  if (!storeRef.current) storeRef.current = stateStore ?? createJotaiStore({ data });
  const store = storeRef.current;

  // Live data injection: prop change -> store write (new reference required by StateStore contract).
  useEffect(() => {
    store.set('/data', data);
  }, [store, data]);

  useEffect(() => {
    if (!onStateChange) return undefined;
    return store.subscribe(() => onStateChange(store.getSnapshot()));
  }, [store, onStateChange]);

  // Runtime: catalog+registry+handlers, memoized on extensions. onEvent via ref so identity is stable.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const allExtensions = useMemo(() => [...financeExtensions, ...(extensions ?? [])], [extensions]);
  const runtime = useMemo(
    () => buildRuntime({ extensions: allExtensions, emit: (name, payload) => onEventRef.current?.(name, payload) }),
    [allExtensions],
  );

  // Strict per-component validator for the same extension set the runtime was built with.
  const validate = useMemo(() => createStrictValidator(runtime.catalog, mergedDefinitions(allExtensions)), [runtime, allExtensions]);

  // Action handlers (defineRegistry's factory) bound to the live store.
  const actionHandlers = useMemo(
    () =>
      runtime.handlers(
        () => (updater) => store.update(updater(store.getSnapshot())),
        () => store.getSnapshot(),
      ),
    [runtime, store],
  );

  return { store, runtime, validate, actionHandlers };
}

export type CanvasRuntime = ReturnType<typeof useCanvasRuntime>;
