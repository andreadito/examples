import { useEffect, useMemo, useRef } from 'react';
import { Stack } from '@mui/material';
import type { CatalogExtension } from './catalog/extension';
import type { StateStore } from './state/types';
import { normalizeSpec } from './llm/normalizeSpec';
import { useCanvasRuntime } from './useCanvasRuntime';
import { CanvasView } from './CanvasView';

export interface GenerativeUICanvasProps {
  /**
   * The UI spec to render — hand-written, loaded from your database, or
   * produced by any external system (see `createAuthoringContext` for the
   * instructions + JSON schema to hand an external author). Controlled:
   * pass a new spec to re-render. Validated on every change; an invalid
   * spec fires `onError` and renders nothing.
   */
  spec: object | null;
  /** Live data; written to state under /data on every change. */
  data: Record<string, unknown>;
  /** Caller-owned state store (e.g. `createXStateStore`). Defaults to a fresh `createJotaiStore`. */
  stateStore?: StateStore;
  /** Extra catalog components. `financeExtensions` are ALWAYS included regardless of this prop. */
  extensions?: CatalogExtension[];
  /** Show the spec/state inspector toggle on the canvas. @default false */
  debug?: boolean;
  /** Shown when `spec` is null. */
  emptyHint?: string;
  onStateChange?: (state: Record<string, unknown>) => void;
  onEvent?: (name: string, payload?: Record<string, unknown>) => void;
  onError?: (error: Error) => void;
}

/**
 * The rendering half of GenerativeUIChat with no LLM attached: a controlled
 * canvas that renders any catalog-conformant spec against live data. Specs
 * go through the exact normalize + strict-validate pipeline the chat loop
 * uses, so a hand-authored or externally generated spec gets the same
 * guarantees (and the same loud failures) as a model-generated one.
 */
export function GenerativeUICanvas(props: GenerativeUICanvasProps) {
  const { spec, debug = false, emptyHint, onError } = props;
  const { store, runtime, validate, actionHandlers } = useCanvasRuntime(props);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const { validSpec, errors } = useMemo(() => {
    if (!spec) return { validSpec: null, errors: null };
    const normalized = normalizeSpec(spec) as object;
    const result = validate(normalized);
    return result.success ? { validSpec: normalized, errors: null } : { validSpec: null, errors: result.errors };
  }, [spec, validate]);

  useEffect(() => {
    if (errors) onErrorRef.current?.(new Error(`spec failed validation: ${errors.join('; ')}`));
  }, [errors]);

  return (
    <Stack direction="row" sx={{ height: '100%' }}>
      <CanvasView
        spec={validSpec}
        runtime={runtime}
        store={store}
        actionHandlers={actionHandlers}
        debug={debug}
        emptyHint={emptyHint ?? 'No spec loaded.'}
        onError={onError}
      />
    </Stack>
  );
}
