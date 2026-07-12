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
  Toolbar,
  Typography,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { GenerativeUIChat } from '../generative-ui';
import { useTicker } from './useTicker';
import { useCallbackLog, CallbackLog } from './CallbackLog';
import { createTradingTheme } from './theme';

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
  const { positions, ohlc, asOf } = useTicker(1000);
  const { entries, log } = useCallbackLog();
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const theme = useMemo(() => createTradingTheme(mode), [mode]);

  const data = useMemo(
    () => ({ positions, ohlc, asOf, totalPnl: positions.reduce((sum, p) => sum + p.pnl, 0) }),
    [positions, ohlc, asOf],
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
              aria-label="toggle color scheme"
              onClick={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <Box sx={{ width: 320, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
            <PositionsTable positions={positions} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <GenerativeUIChat
              data={data}
              dataDescription="Live trading positions (refreshed every second) and per-symbol OHLC history"
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
    </ThemeProvider>
  );
}
