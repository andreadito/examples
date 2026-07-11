import { useCallback, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

export interface LogEntry {
  time: number;
  name: string;
  detail?: unknown;
}

const MAX_ENTRIES = 20;
const STATE_CHANGE_THROTTLE_MS = 1000;

/**
 * Bounded callback log with built-in throttling for `onStateChange`, which
 * would otherwise fire once per ticker tick and flood the panel.
 */
export function useCallbackLog(maxEntries = MAX_ENTRIES) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const lastStateChangeRef = useRef(0);

  const log = useCallback(
    (name: string, detail?: unknown) => {
      if (name === 'onStateChange') {
        const now = Date.now();
        if (now - lastStateChangeRef.current < STATE_CHANGE_THROTTLE_MS) return;
        lastStateChangeRef.current = now;
      }
      setEntries((prev) => [{ time: Date.now(), name, detail }, ...prev].slice(0, maxEntries));
    },
    [maxEntries],
  );

  return { entries, log };
}

function formatDetail(detail: unknown): string {
  if (detail === undefined) return '';
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export function CallbackLog({ entries }: { entries: LogEntry[] }) {
  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: 12,
        px: 1.5,
        py: 1,
        bgcolor: 'background.paper',
      }}
    >
      {entries.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          No callbacks yet — ask the chat to build something.
        </Typography>
      )}
      {entries.map((entry, i) => (
        <Box key={`${entry.time}-${i}`} sx={{ whiteSpace: 'pre', color: 'text.primary' }}>
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {new Date(entry.time).toLocaleTimeString()}{' '}
          </Box>
          <Box component="span" sx={{ fontWeight: 600 }}>
            {entry.name}
          </Box>
          {entry.detail !== undefined && <Box component="span"> {formatDetail(entry.detail)}</Box>}
        </Box>
      ))}
    </Box>
  );
}
