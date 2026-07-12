import { useState } from 'react';
import { Box } from '@mui/material';

const MONO = "ui-monospace, 'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";

function ValueSpan({ value }: { value: unknown }) {
  const color =
    typeof value === 'string' ? 'success.main' : typeof value === 'number' ? 'warning.main' : 'error.main';
  const text = typeof value === 'string' ? `"${value}"` : String(value);
  return (
    <Box component="span" sx={{ color }}>
      {text}
    </Box>
  );
}

interface NodeProps {
  name: string | null;
  value: unknown;
  depth: number;
  defaultDepth: number;
}

function JsonNode({ name, value, depth, defaultDepth }: NodeProps) {
  const [open, setOpen] = useState(depth < defaultDepth);
  const isObject = typeof value === 'object' && value !== null;

  if (!isObject) {
    return (
      <Box sx={{ pl: depth * 2, whiteSpace: 'nowrap' }}>
        {name !== null ? <Box component="span" sx={{ color: 'text.secondary' }}>{name}: </Box> : null}
        <ValueSpan value={value} />
      </Box>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);
  const summary = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;

  return (
    <Box>
      <Box
        onClick={() => setOpen((o) => !o)}
        sx={{ pl: depth * 2, cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', '&:hover': { bgcolor: 'action.hover' } }}
      >
        <Box component="span" sx={{ color: 'text.secondary', display: 'inline-block', width: 12 }}>
          {open ? '▾' : '▸'}
        </Box>
        {name !== null ? <Box component="span" sx={{ color: 'text.secondary' }}>{name}: </Box> : null}
        <Box component="span" sx={{ color: 'text.primary', opacity: 0.7 }}>{summary}</Box>
      </Box>
      {open
        ? entries.map(([k, v]) => <JsonNode key={k} name={k} value={v} depth={depth + 1} defaultDepth={defaultDepth} />)
        : null}
    </Box>
  );
}

/** Compact collapsible JSON tree in the terminal mono style. */
export function JsonTree({ value, defaultDepth = 2 }: { value: unknown; defaultDepth?: number }) {
  return (
    <Box sx={{ fontFamily: MONO, fontSize: '0.6875rem', lineHeight: 1.6, p: 1, overflow: 'auto', flex: 1, minHeight: 0 }}>
      <JsonNode name={null} value={value} depth={0} defaultDepth={defaultDepth} />
    </Box>
  );
}
