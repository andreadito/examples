import { Suspense, useState } from 'react';
import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { JSONUIProvider, Renderer } from '@json-render/react';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { DebugPanel } from './DebugPanel';
import type { TurnLogEntry } from './DebugPanel';
import type { CanvasRuntime } from './useCanvasRuntime';

export interface CanvasViewProps {
  spec: object | null;
  runtime: CanvasRuntime['runtime'];
  store: CanvasRuntime['store'];
  actionHandlers: CanvasRuntime['actionHandlers'];
  debug: boolean;
  turns?: TurnLogEntry[];
  emptyHint?: string;
  onError?: (error: Error) => void;
}

/**
 * The rendering surface shared by GenerativeUIChat and GenerativeUICanvas:
 * error-bounded json-render canvas + optional inspector panel. Returns a
 * fragment (canvas box flex:1 + fixed-width panel) meant to live inside a
 * `Stack direction="row"`.
 */
export function CanvasView({ spec, runtime, store, actionHandlers, debug, turns, emptyHint, onError }: CanvasViewProps) {
  const [inspectorOpen, setInspectorOpen] = useState(false);

  return (
    <>
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
              {spec ? (
                <Renderer spec={spec as never} registry={runtime.registry} />
              ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', textAlign: 'center', p: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {emptyHint ?? 'Ask the chat to build something from your live data.'}
                  </Typography>
                </Stack>
              )}
            </Suspense>
          </JSONUIProvider>
        </CanvasErrorBoundary>
      </Box>
      {debug && inspectorOpen ? (
        <Box sx={{ width: 360, flexShrink: 0, minWidth: 0 }}>
          <DebugPanel spec={spec} store={store} functions={runtime.functions} turns={turns ?? []} onClose={() => setInspectorOpen(false)} />
        </Box>
      ) : null}
    </>
  );
}
