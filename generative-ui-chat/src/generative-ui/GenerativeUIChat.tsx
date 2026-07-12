import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { ChatBox } from '@mui/x-chat';
import type { ChatAdapter } from '@mui/x-chat/headless';
import type { CatalogExtension } from './catalog/extension';
import type { StateStore } from './state/types';
import { generate, FALLBACK_ASSISTANT_TEXT } from './llm/generate';
import type { ChatTurn, GenerateResult } from './llm/generate';
import { describeData } from './llm/describeData';
import { normalizeSpec } from './llm/normalizeSpec';
import type { TurnLogEntry } from './DebugPanel';
import { useCanvasRuntime } from './useCanvasRuntime';
import { CanvasView } from './CanvasView';

export interface GenerativeUIChatProps {
  /** Live data; written to state under /data on every change. */
  data: Record<string, unknown>;
  /** Optional prose hint prepended to the auto-generated data description. */
  dataDescription?: string;
  /** Caller-owned state store (e.g. `createXStateStore`). Defaults to a fresh `createJotaiStore`. */
  stateStore?: StateStore;
  /**
   * A previously stored spec (captured via `onSpecChange`) to render on
   * mount. It goes through the same normalize + strict-validate pipeline as
   * a generated spec — an invalid spec fires `onError` and leaves the canvas
   * empty. Once rendered it is the current spec, so follow-up chat prompts
   * edit it. Read once on mount; later changes to this prop are ignored.
   */
  initialSpec?: object | null;
  /** Extra catalog components. `financeExtensions` are ALWAYS included regardless of this prop. */
  extensions?: CatalogExtension[];
  /** Proxy endpoint the generation loop calls. @default '/api/claude' */
  endpoint?: string;
  /** Show the spec/state inspector toggle on the canvas. @default true */
  debug?: boolean;
  onSpecChange?: (spec: object | null) => void;
  onStateChange?: (state: Record<string, unknown>) => void;
  onEvent?: (name: string, payload?: Record<string, unknown>) => void;
  onError?: (error: Error) => void;
}

function isTextPart(part: { type: string }): part is { type: 'text'; text: string } {
  return part.type === 'text';
}

/**
 * Canvas (json-render `Renderer`) + chat panel (MUI X `ChatBox`) wired
 * together: user prompts drive the generation loop (`generate()`), the
 * resulting spec renders live against a shared state store, and lifecycle
 * callbacks let the host observe spec/state changes, emitted UI events, and
 * errors.
 */
export function GenerativeUIChat(props: GenerativeUIChatProps) {
  const { data, dataDescription, stateStore, extensions, endpoint = '/api/claude', debug = true, initialSpec, onSpecChange, onStateChange, onEvent, onError } = props;

  // 1-4. Store (pinned, live /data injection), catalog runtime, strict
  // validator, and store-bound action handlers — shared with the headless
  // GenerativeUICanvas via useCanvasRuntime.
  const { store, runtime, validate, actionHandlers } = useCanvasRuntime({ data, stateStore, extensions, onEvent, onStateChange });
  const storeRef = useRef(store);
  storeRef.current = store;
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;
  const validateRef = useRef(validate);
  validateRef.current = validate;

  // 5. Spec + history (text transcript only).
  const [spec, setSpec] = useState<object | null>(null);
  const specRef = useRef(spec);
  specRef.current = spec;
  const historyRef = useRef<ChatTurn[]>([]);

  // Restore a persisted spec (mount only): same normalize + strict-validate
  // path as a generated spec, so a stale or hand-edited stored spec cannot
  // crash the renderer — it fails loudly through onError instead.
  const initialSpecAppliedRef = useRef(false);
  useEffect(() => {
    if (initialSpecAppliedRef.current) return;
    initialSpecAppliedRef.current = true;
    if (!initialSpec) return;
    const normalized = normalizeSpec(initialSpec) as object;
    const result = validateRef.current(normalized);
    if (result.success) {
      setSpec(normalized);
    } else {
      onErrorRef.current?.(new Error(`initialSpec failed validation: ${result.errors.join('; ')}`));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only restore by design
  }, []);

  const endpointRef = useRef(endpoint);
  endpointRef.current = endpoint;
  const dataDescriptionRef = useRef(dataDescription);
  dataDescriptionRef.current = dataDescription;
  const onSpecChangeRef = useRef(onSpecChange);
  onSpecChangeRef.current = onSpecChange;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // 6. Chat adapter — STABLE identity (useMemo with [] and refs inside), so
  // ChatBox never re-mounts its internal conversation state.
  const adapter = useMemo<ChatAdapter>(
    () => ({
      sendMessage: async ({ message, signal }) => {
        const prompt = message.parts
          .filter(isTextPart)
          .map((part) => part.text)
          .join('\n');
        const turnStartedAt = Date.now();
        let result: GenerateResult;
        try {
          result = await generate({
            endpoint: endpointRef.current,
            catalog: runtimeRef.current.catalog,
            validate: validateRef.current,
            history: historyRef.current,
            prompt,
            currentSpec: specRef.current,
            dataInfo: describeData(storeRef.current!.get('/data'), dataDescriptionRef.current),
            signal,
          });
        } catch (err) {
          setTurns((prev) => [...prev.slice(-49), { at: turnStartedAt, prompt, ms: Date.now() - turnStartedAt, outcome: 'error' as const, error: err instanceof Error ? err.message : String(err) }]);
          onErrorRef.current?.(err as Error);
          throw err; // ChatBox renders its built-in error card with Retry
        }
        if (result.spec) {
          setSpec(result.spec);
          onSpecChangeRef.current?.(result.spec);
        }
        // Same fallback as the display path below: a render_ui-only response
        // has no text block, so `result.text` is `''`. Storing that verbatim
        // would replay as an empty assistant content block next turn, which
        // the Anthropic API rejects with a 400 (see generate.ts's
        // FALLBACK_ASSISTANT_TEXT doc comment).
        setTurns((prev) => [...prev.slice(-49), { at: turnStartedAt, prompt, ms: Date.now() - turnStartedAt, outcome: result.spec ? ('spec' as const) : ('text' as const), elements: result.spec ? Object.keys((result.spec as { elements?: object }).elements ?? {}).length : undefined }]);
        historyRef.current = [
          ...historyRef.current,
          { role: 'user', text: prompt },
          { role: 'assistant', text: result.text || FALLBACK_ASSISTANT_TEXT },
        ];
        const messageId = crypto.randomUUID();
        return new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'start', messageId });
            controller.enqueue({ type: 'text-start', id: 'text-1' });
            controller.enqueue({ type: 'text-delta', id: 'text-1', delta: result.text || FALLBACK_ASSISTANT_TEXT });
            controller.enqueue({ type: 'text-end', id: 'text-1' });
            controller.enqueue({ type: 'finish', messageId });
            controller.close();
          },
        });
      },
    }),
    [],
  );

  const [turns, setTurns] = useState<TurnLogEntry[]>([]);

  // 7. Layout: canvas (flex 1) + optional inspector + chat panel (fixed 380px).
  return (
    <Stack direction="row" sx={{ height: '100%', minHeight: 480 }}>
      <CanvasView
        spec={spec}
        runtime={runtime}
        store={store}
        actionHandlers={actionHandlers}
        debug={debug}
        turns={turns}
        onError={onError}
      />
      <Box sx={{ width: 380, borderLeft: '1px solid', borderColor: 'divider' }}>
        <ChatBox
          adapter={adapter}
          initialConversations={[{ id: 'main', title: 'UI Builder' }]}
          initialActiveConversationId="main"
          slotProps={{ composerInput: { placeholder: 'Build me something with this data…' } }}
          onError={(e) => onError?.(new Error(e.message))}
          sx={{ height: '100%' }}
        />
      </Box>
    </Stack>
  );
}
