import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, FormControlLabel, IconButton, Switch, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import type { StateStore } from './state/types';
import { getStoreMeta } from './state/storeMeta';
import { diffSnapshots, extractBindings, preview, resolveBinding, searchPaths } from './debugUtils';
import type { BindingRow, StateChange } from './debugUtils';
import { JsonTree } from './JsonTree';

const MONO = "ui-monospace, 'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";
const STATE_REFRESH_MS = 1000;

/** One generation turn's outcome, recorded by GenerativeUIChat's adapter. */
export interface TurnLogEntry {
  at: number;
  prompt: string;
  ms: number;
  outcome: 'spec' | 'text' | 'error';
  elements?: number;
  error?: string;
}

export interface DebugPanelProps {
  spec: object | null;
  store: StateStore;
  functions: Record<string, (args: Record<string, unknown>) => unknown>;
  turns: TurnLogEntry[];
  onClose: () => void;
}

type TabKey = 'elements' | 'bindings' | 'state' | 'store' | 'spec' | 'turns';

/** One recorded state mutation (a batch of leaf changes from a single store notification). */
export interface MutationLogEntry extends StateChange {
  at: number;
}

const MUTATION_LOG_CAP = 200;

const mono = (size = '0.6875rem') => ({ fontFamily: MONO, fontSize: size });

interface SpecElementShape {
  type?: string;
  children?: string[];
  props?: Record<string, unknown>;
}

function ElementNode({
  elementKey,
  elements,
  depth,
  bindingCounts,
}: {
  elementKey: string;
  elements: Record<string, SpecElementShape>;
  depth: number;
  bindingCounts: Record<string, number>;
}) {
  const [showProps, setShowProps] = useState(false);
  const element = elements[elementKey];
  if (!element) {
    return (
      <Box sx={{ pl: depth * 2, ...mono(), color: 'error.main' }}>{elementKey} (missing element)</Box>
    );
  }
  const children = element.children ?? [];
  const bindings = bindingCounts[elementKey] ?? 0;
  return (
    <Box>
      <Box
        onClick={() => setShowProps((v) => !v)}
        sx={{ pl: depth * 2, py: '1px', cursor: 'pointer', whiteSpace: 'nowrap', '&:hover': { bgcolor: 'action.hover' }, ...mono() }}
      >
        <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
          {element.type ?? '?'}
        </Box>{' '}
        <Box component="span" sx={{ color: 'text.secondary' }}>
          #{elementKey}
        </Box>
        {bindings > 0 ? (
          <Chip label={`${bindings}⇢`} size="small" sx={{ ml: 0.75, height: 14, fontSize: '0.5625rem', ...{ fontFamily: MONO } }} />
        ) : null}
      </Box>
      {showProps ? (
        <Box sx={{ pl: depth * 2 + 2, borderLeft: '1px solid', borderColor: 'divider', ml: 1 }}>
          <JsonTree value={element.props ?? {}} defaultDepth={1} />
        </Box>
      ) : null}
      {children.map((child) => (
        <ElementNode key={child} elementKey={child} elements={elements} depth={depth + 1} bindingCounts={bindingCounts} />
      ))}
    </Box>
  );
}

function ElementsTab({ spec, bindings }: { spec: object | null; bindings: BindingRow[] }) {
  if (!spec) return <Hint text="Nothing generated yet — the element tree appears after the first build." />;
  const { root, elements } = spec as { root?: string; elements?: Record<string, SpecElementShape> };
  if (!root || !elements) return <Hint text="Spec has no root/elements." />;
  const bindingCounts: Record<string, number> = {};
  for (const b of bindings) bindingCounts[b.element] = (bindingCounts[b.element] ?? 0) + 1;
  return (
    <Box sx={{ overflow: 'auto', flex: 1, minHeight: 0, p: 1 }}>
      <ElementNode elementKey={root} elements={elements} depth={0} bindingCounts={bindingCounts} />
    </Box>
  );
}

function BindingsTab({
  bindings,
  store,
  functions,
  tick,
}: {
  bindings: BindingRow[];
  store: StateStore;
  functions: DebugPanelProps['functions'];
  tick: number;
}) {
  void tick; // re-render trigger: live values re-resolve on each refresh
  if (bindings.length === 0) return <Hint text="No bindings in the current spec." />;
  return (
    <Box sx={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
      {bindings.map((row, i) => (
        <Box key={i} sx={{ px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ ...mono(), whiteSpace: 'nowrap' }}>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              #{row.element}.{row.prop}
            </Box>{' '}
            <Box component="span" sx={{ color: 'primary.main' }}>{row.kind}</Box>{' '}
            <Box component="span">{row.detail}</Box>
          </Box>
          <Box sx={{ ...mono('0.625rem'), color: 'success.main', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            = {preview(resolveBinding(row, store, functions))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function StateTab({ store, tick }: { store: StateStore; tick: number }) {
  void tick;
  const [query, setQuery] = useState('');
  const snapshot = store.getSnapshot();
  const matches = query ? searchPaths(snapshot, query) : null;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <TextField
        placeholder="Filter paths, e.g. threshold or /data/fx"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        size="small"
        sx={{ m: 1, '& input': mono() }}
      />
      {matches ? (
        <Box sx={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
          {matches.length === 0 ? <Hint text="No matching paths." /> : null}
          {matches.map((m) => (
            <Box key={m.path} sx={{ px: 1, py: '2px', ...mono(), whiteSpace: 'nowrap' }}>
              <Box component="span" sx={{ color: 'text.secondary' }}>{m.path}</Box>{' '}
              <Box component="span" sx={{ color: 'success.main' }}>{preview(m.value, 60)}</Box>
            </Box>
          ))}
        </Box>
      ) : (
        <JsonTree value={snapshot} defaultDepth={1} />
      )}
    </Box>
  );
}

function StoreTab({
  store,
  mutations,
  onClear,
}: {
  store: StateStore;
  mutations: MutationLogEntry[];
  onClear: () => void;
}) {
  const meta = getStoreMeta(store);
  const [muteData, setMuteData] = useState(true);
  const [showInitial, setShowInitial] = useState(false);
  const visible = muteData ? mutations.filter((m) => !m.path.startsWith('/data')) : mutations;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Chip label={meta?.engine ?? 'custom'} size="small" color="primary" variant="outlined" sx={{ fontFamily: MONO }} />
        <Box
          onClick={() => setShowInitial((v) => !v)}
          sx={{ ...mono(), color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'text.primary' } }}
        >
          initial state {showInitial ? '▾' : '▸'}
        </Box>
        <Box sx={{ flex: 1 }} />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={muteData}
              onChange={(e) => setMuteData(e.target.checked)}
              slotProps={{ input: { 'aria-label': 'mute /data' } }}
            />
          }
          label={<Box sx={mono('0.625rem')}>mute /data</Box>}
          sx={{ mr: 0 }}
        />
        <Tooltip title="Clear mutation log">
          <IconButton size="small" onClick={onClear} aria-label="clear mutations">
            <DeleteSweepIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>
      {showInitial ? (
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', maxHeight: 140, overflow: 'auto', p: 0.5 }}>
          {meta ? (
            <JsonTree value={meta.initialState} defaultDepth={2} />
          ) : (
            <Hint text="Caller-provided store — engine and initial state unknown to the inspector (build it with createStateStore/createJotaiStore/createXStateStore to tag it)." />
          )}
        </Box>
      ) : null}
      <Box sx={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        {visible.length === 0 ? (
          <Hint
            text={
              mutations.length > 0
                ? 'Only /data ticks so far — unmute to see them.'
                : 'No mutations yet — interact with the UI (or wait for a data tick) and every state write lands here: path, old value, new value.'
            }
          />
        ) : (
          visible.map((m, i) => (
            <Box key={`${m.at}-${m.path}-${i}`} sx={{ px: 1, py: '2px', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ ...mono(), whiteSpace: 'nowrap' }}>
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  {new Date(m.at).toLocaleTimeString()}
                </Box>{' '}
                <Box component="span" sx={{ color: 'primary.main' }}>{m.path}</Box>
              </Box>
              <Box sx={{ ...mono('0.625rem'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Box component="span" sx={{ color: 'error.main' }}>{preview(m.from, 40)}</Box>
                <Box component="span" sx={{ color: 'text.secondary' }}> → </Box>
                <Box component="span" sx={{ color: 'success.main' }}>{preview(m.to, 40)}</Box>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

function TurnsTab({ turns }: { turns: TurnLogEntry[] }) {
  if (turns.length === 0) return <Hint text="No generations this session yet." />;
  const dot = (outcome: TurnLogEntry['outcome']) =>
    outcome === 'spec' ? 'success.main' : outcome === 'error' ? 'error.main' : 'text.secondary';
  return (
    <Box sx={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
      {[...turns].reverse().map((turn, i) => (
        <Box key={i} sx={{ px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ ...mono(), whiteSpace: 'nowrap' }}>
            <Box component="span" sx={{ color: dot(turn.outcome) }}>●</Box>{' '}
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {new Date(turn.at).toLocaleTimeString()}
            </Box>{' '}
            <Box component="span">{(turn.ms / 1000).toFixed(1)}s</Box>
            {turn.elements !== undefined ? <Box component="span" sx={{ color: 'text.secondary' }}> · {turn.elements} elements</Box> : null}
            <Box component="span" sx={{ color: 'text.secondary' }}> · {turn.outcome}</Box>
          </Box>
          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {turn.prompt}
          </Typography>
          {turn.error ? (
            <Box sx={{ ...mono('0.625rem'), color: 'error.main', whiteSpace: 'pre-wrap' }}>{turn.error}</Box>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
      {text}
    </Typography>
  );
}

/**
 * Inspector for generated UIs: element tree, live data bindings, searchable
 * state, raw spec, and a per-generation turn log. Works with any StateStore
 * (jotai, xstate, custom).
 */
export function DebugPanel({ spec, store, functions, turns, onClose }: DebugPanelProps) {
  const [tab, setTab] = useState<TabKey>('elements');
  const [tick, setTick] = useState(0);

  // Live tabs re-resolve against the store once a second while visible.
  useEffect(() => {
    if (tab !== 'state' && tab !== 'bindings') return;
    const id = setInterval(() => setTick((t) => t + 1), STATE_REFRESH_MS);
    return () => clearInterval(id);
  }, [tab]);

  // Mutation log: recorded for the panel's whole lifetime (not just while
  // the STORE tab is visible), so opening the tab shows history, and it
  // reads like an event/transition log whichever engine backs the store.
  const [mutations, setMutations] = useState<MutationLogEntry[]>([]);
  const prevSnapshotRef = useRef<Record<string, unknown> | null>(null);
  useEffect(() => {
    prevSnapshotRef.current = store.getSnapshot();
    return store.subscribe(() => {
      const next = store.getSnapshot();
      const changes = diffSnapshots(prevSnapshotRef.current, next);
      prevSnapshotRef.current = next;
      if (changes.length === 0) return;
      const at = Date.now();
      setMutations((prev) => [...changes.map((c) => ({ at, ...c })), ...prev].slice(0, MUTATION_LOG_CAP));
    });
  }, [store]);

  const bindings = useMemo(() => extractBindings(spec), [spec]);

  const copy = () => {
    const value =
      tab === 'state'
        ? store.getSnapshot()
        : tab === 'store'
          ? { engine: getStoreMeta(store)?.engine ?? 'custom', initialState: getStoreMeta(store)?.initialState, mutations }
          : tab === 'turns'
            ? turns
            : spec;
    try {
      void navigator.clipboard?.writeText(JSON.stringify(value, null, 2));
    } catch {
      /* clipboard unavailable — ignore */
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
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1, minHeight: 32 }} variant="scrollable">
          <Tab value="elements" label="Elements" />
          <Tab value="bindings" label={`Bindings${bindings.length ? ` (${bindings.length})` : ''}`} />
          <Tab value="state" label="State" />
          <Tab value="store" label="Store" />
          <Tab value="spec" label="Spec" />
          <Tab value="turns" label={`Turns${turns.length ? ` (${turns.length})` : ''}`} />
        </Tabs>
        <Tooltip title="Copy tab JSON">
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
      {tab === 'elements' ? <ElementsTab spec={spec} bindings={bindings} /> : null}
      {tab === 'bindings' ? <BindingsTab bindings={bindings} store={store} functions={functions} tick={tick} /> : null}
      {tab === 'state' ? <StateTab store={store} tick={tick} /> : null}
      {tab === 'store' ? <StoreTab store={store} mutations={mutations} onClear={() => setMutations([])} /> : null}
      {tab === 'spec' ? (spec ? <JsonTree value={spec} defaultDepth={2} /> : <Hint text="Nothing generated yet — the spec appears here after the first build." />) : null}
      {tab === 'turns' ? <TurnsTab turns={turns} /> : null}
    </Box>
  );
}
