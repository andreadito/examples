import { useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import StorageIcon from '@mui/icons-material/Storage';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { Badge } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import { GenerativeUIChat, createXStateStore } from '../generative-ui';
import { useTicker } from './useTicker';
import { useCallbackLog, CallbackLog } from './CallbackLog';
import { createTradingTheme } from './theme';
import { useCustomSources } from './dataSources';
import { DataSourcesDialog } from './DataSourcesDialog';

const APP_BAR_HEIGHT = 44;
const LOG_HEIGHT = 110;

function PositionsTable({ positions }: { positions: ReturnType<typeof useTicker>['positions'] }) {
  return (
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell>Symbol</TableCell>
          <TableCell align="right">Last</TableCell>
          <TableCell align="right">P&amp;L</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {positions.map((p) => (
          <TableRow key={p.symbol} hover>
            <TableCell>
              <Typography variant="body2" component="span">
                {p.symbol}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                {p.sector}
              </Typography>
            </TableCell>
            <TableCell align="right">{p.lastPrice.toFixed(2)}</TableCell>
            <TableCell align="right" sx={{ color: p.pnl >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
              {p.pnl >= 0 ? '+' : ''}
              {p.pnl.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function App() {
  const { positions, ohlc, book, news, fx, rates, credit, asOf } = useTicker(1000);
  const { entries, log } = useCallbackLog();
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const theme = useMemo(() => createTradingTheme(mode), [mode]);
  // Which StateStore backs the generated UI. GenerativeUIChat pins its store
  // for the component's lifetime, so switching remounts it via `key` (the
  // canvas resets — that's the honest cost of swapping the state engine).
  const [storeKind, setStoreKind] = useState<'jotai' | 'xstate'>('jotai');
  const xstateStore = useMemo(() => (storeKind === 'xstate' ? createXStateStore({}) : undefined), [storeKind]);
  const { sources, values: customValues, urlErrors, addSource, removeSource } = useCustomSources();
  const [sourcesOpen, setSourcesOpen] = useState(false);
  // Raw-feed sidebar: off by default — the generated canvas is the point, and
  // the inspector's STATE tab shows the same data. Toggle from the AppBar.
  const [feedOpen, setFeedOpen] = useState(false);

  const data = useMemo(
    () => ({
      positions,
      ohlc,
      book,
      news,
      fx,
      rates,
      credit,
      asOf,
      totalPnl: positions.reduce((sum, p) => sum + p.pnl, 0),
      ...customValues,
    }),
    [positions, ohlc, book, news, fx, rates, credit, asOf, customValues],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static" sx={{ height: APP_BAR_HEIGHT, justifyContent: 'center' }}>
          <Toolbar variant="dense">
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Trading Desk — Generative UI demo
            </Typography>
            <IconButton
              color="inherit"
              aria-label="toggle raw feed table"
              onClick={() => setFeedOpen((open) => !open)}
              sx={{ mr: 0.5, opacity: feedOpen ? 1 : 0.6 }}
            >
              <TableRowsIcon fontSize="small" />
            </IconButton>
            <IconButton color="inherit" aria-label="custom data sources" onClick={() => setSourcesOpen(true)} sx={{ mr: 0.5 }}>
              <Badge badgeContent={sources.length} color="primary">
                <StorageIcon fontSize="small" />
              </Badge>
            </IconButton>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={storeKind}
              onChange={(_, v) => v && setStoreKind(v)}
              aria-label="state store"
              sx={{ mr: 1.5, '& .MuiToggleButton-root': { color: 'inherit', px: 1.5, py: 0.25, fontSize: '0.6875rem' } }}
            >
              <ToggleButton value="jotai">jotai</ToggleButton>
              <ToggleButton value="xstate">xstate</ToggleButton>
            </ToggleButtonGroup>
            <IconButton
              color="inherit"
              aria-label="toggle color scheme"
              onClick={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {feedOpen ? (
            <Box sx={{ width: 320, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
              <PositionsTable positions={positions} />
            </Box>
          ) : null}

          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <GenerativeUIChat
              key={storeKind}
              stateStore={xstateStore}
              data={data}
              dataDescription="Multi-desk live trading data: equity positions (positions, with per-symbol ohlc + book depth), FX desk (fx: pairs/rates/pips), rates desk (rates: yields/bps/DV01), credit desk (credit: CDS spreads in bps), streaming news"
              onSpecChange={(s) => {
                // Full spec at debug level — invaluable when a generated UI misbehaves.
                console.debug('[demo] spec', JSON.stringify(s));
                log('onSpecChange', { elements: s ? Object.keys((s as { elements: object }).elements).length : 0 });
              }}
              onStateChange={() => log('onStateChange')}
              onEvent={(name, payload) => log(`onEvent:${name}`, payload)}
              onError={(e) => log('onError', { message: e.message })}
            />
          </Box>
        </Box>

        <Box sx={{ height: LOG_HEIGHT, flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}>
          <CallbackLog entries={entries} />
        </Box>
      </Box>
      <DataSourcesDialog
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        sources={sources}
        urlErrors={urlErrors}
        onAdd={addSource}
        onRemove={removeSource}
      />
    </ThemeProvider>
  );
}
