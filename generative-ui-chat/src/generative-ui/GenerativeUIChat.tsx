import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { JSONUIProvider, Renderer } from '@json-render/react';
import { ChatBox } from '@mui/x-chat';
import type { ChatAdapter } from '@mui/x-chat/headless';
import { buildRuntime } from './catalog/buildRuntime';
import { financeExtensions } from './catalog/financeExtensions';
import type { CatalogExtension } from './catalog/extension';
import { createJotaiStore } from './state/jotaiStore';
import type { StateStore } from './state/types';
import { generate, FALLBACK_ASSISTANT_TEXT } from './llm/generate';
import type { ChatTurn, GenerateResult } from './llm/generate';
import { describeData } from './llm/describeData';
import { createStrictValidator, mergedDefinitions } from './llm/strictValidate';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { DebugPanel } from './DebugPanel';

export interface GenerativeUIChatProps {
  /** Live data; written to state under /data on every change. */
  data: Record<string, unknown>;
  /** Optional prose hint prepended to the auto-generated data description. */
  dataDescription?: string;
  /** Caller-owned state store (e.g. `createXStateStore`). Defaults to a fresh `createJotaiStore`. */
  stateStore?: StateStore;
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

function EmptyCanvasHint() {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', textAlign: 'center', p: 4 }}>
      <Typography variant="body1" color="text.secondary">
        Ask the chat to build something from your live data.
      </Typography>
    </Stack>
  );
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
  const { data, dataDescription, stateStore, extensions, endpoint = '/api/claude', debug = true, onSpecChange, onStateChange, onEvent, onError } = props;

  // 1. Store: caller's or default jotai; stable for component lifetime.
  const storeRef = useRef<StateStore | undefined>(undefined);
  if (!storeRef.current) storeRef.current = stateStore ?? createJotaiStore({ data });
  const store = storeRef.current;

  // 2. Live data injection: prop change -> store write (new reference required by StateStore contract).
  useEffect(() => {
    store.set('/data', data);
  }, [store, data]);

  // 3. onStateChange subscription.
  useEffect(() => {
    if (!onStateChange) return undefined;
    return store.subscribe(() => onStateChange(store.getSnapshot()));
  }, [store, onStateChange]);

  // 4. Runtime: catalog+registry+handlers, memoized on extensions. onEvent via ref so identity is stable.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const allExtensions = useMemo(() => [...financeExtensions, ...(extensions ?? [])], [extensions]);
  const runtime = useMemo(
    () => buildRuntime({ extensions: allExtensions, emit: (name, payload) => onEventRef.current?.(name, payload) }),
    [allExtensions],
  );
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  // Strict per-component validator for the same extension set the runtime was built with.
  const validate = useMemo(() => createStrictValidator(runtime.catalog, mergedDefinitions(allExtensions)), [runtime, allExtensions]);
  const validateRef = useRef(validate);
  validateRef.current = validate;

  // Action handlers (defineRegistry's factory) bound to the live store.
  const actionHandlers = useMemo(
    () =>
      runtime.handlers(
        () => (updater) => store.update(updater(store.getSnapshot())),
        () => store.getSnapshot(),
      ),
    [runtime, store],
  );

  // 5. Spec + history (text transcript only).
  const [spec, setSpec] = useState<object | null>(null);
  const specRef = useRef(spec);
  specRef.current = spec;
  const historyRef = useRef<ChatTurn[]>([]);

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

  const [inspectorOpen, setInspectorOpen] = useState(false);

  // 7. Layout: canvas (flex 1) + optional inspector + chat panel (fixed 380px).
  return (
    <Stack direction="row" sx={{ height: '100%', minHeight: 480 }}>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, position: 'relative' }}>
        {debug ? (
          <Tooltip title="Inspect generated spec & live state">
            <IconButton
              size="small"
              aria-label="open inspector"
              onClick={() => setInspectorOpen((open) => !open)}
              sx={{ position: 'absolute', top: 6, right: 6, zIndex: 2, color: inspectorOpen ? 'primary.main' : 'text.secondary' }}
            >
              <DataObjectIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : null}
        <CanvasErrorBoundary onError={onError} resetKey={spec}>
          <JSONUIProvider registry={runtime.registry} store={store} handlers={actionHandlers} functions={runtime.functions}>
            <Suspense fallback={<CircularProgress />}>
              {spec ? <Renderer spec={spec as never} registry={runtime.registry} /> : <EmptyCanvasHint />}
            </Suspense>
          </JSONUIProvider>
        </CanvasErrorBoundary>
      </Box>
      {debug && inspectorOpen ? (
        <Box sx={{ width: 360, flexShrink: 0, minWidth: 0 }}>
          <DebugPanel spec={spec} store={store} onClose={() => setInspectorOpen(false)} />
        </Box>
      ) : null}
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
