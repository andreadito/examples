import { useEffect, useMemo, useState } from 'react';
import { Box, IconButton, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import type { StateStore } from './state/types';

const MONO = "ui-monospace, 'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";

/** Refresh cadence for the live state tab — matches typical ticker cadence. */
const STATE_REFRESH_MS = 1000;

function JsonView({ value }: { value: unknown }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2) ?? 'undefined';
    } catch {
      return '<unserializable>';
    }
  }, [value]);
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1,
        fontFamily: MONO,
        fontSize: '0.6875rem',
        lineHeight: 1.5,
        overflow: 'auto',
        flex: 1,
        minHeight: 0,
        whiteSpace: 'pre',
      }}
    >
      {text}
    </Box>
  );
}

export interface DebugPanelProps {
  spec: object | null;
  store: StateStore;
  onClose: () => void;
}

/**
 * Inspector for what the LLM actually generated and what the UI is bound to:
 * SPEC shows the current json-render config; STATE shows a live snapshot of
 * the state store (jotai/xstate/custom — anything satisfying StateStore).
 */
export function DebugPanel({ spec, store, onClose }: DebugPanelProps) {
  const [tab, setTab] = useState<'spec' | 'state'>('spec');
  const [stateSnapshot, setStateSnapshot] = useState<Record<string, unknown>>(() => store.getSnapshot());

  // Live state view: poll on an interval rather than subscribing — the store
  // changes every ticker tick, and a 1s repaint of a JSON blob is easier on
  // the renderer than one repaint per store notification.
  useEffect(() => {
    if (tab !== 'state') return;
    setStateSnapshot(store.getSnapshot());
    const id = setInterval(() => setStateSnapshot(store.getSnapshot()), STATE_REFRESH_MS);
    return () => clearInterval(id);
  }, [tab, store]);

  const current = tab === 'spec' ? spec : stateSnapshot;

  const copy = () => {
    try {
      void navigator.clipboard?.writeText(JSON.stringify(current, null, 2));
    } catch {
      /* clipboard unavailable (permissions/insecure context) — ignore */
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderLeft: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', pr: 0.5 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1 }}>
          <Tab value="spec" label="Spec" />
          <Tab value="state" label="State" />
        </Tabs>
        <Tooltip title="Copy JSON">
          <IconButton size="small" onClick={copy} aria-label="copy json">
            <ContentCopyIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Close inspector">
          <IconButton size="small" onClick={onClose} aria-label="close inspector">
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
      {tab === 'spec' && !spec ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          Nothing generated yet — the spec appears here after the first build.
        </Typography>
      ) : (
        <JsonView value={current} />
      )}
    </Box>
  );
}
