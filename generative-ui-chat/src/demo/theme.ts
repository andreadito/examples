import { createTheme } from '@mui/material';
import type { Theme } from '@mui/material';

/**
 * Trading-desk theme, dark-first. Conventions traders expect:
 * - teal-green gains / soft-red losses (the classic terminal pairing, easier
 *   on the eyes than saturated web green/red during long sessions)
 * - tabular numerals everywhere so ticking prices don't jitter horizontally
 * - dense type scale (13px base) for information density
 */
export function createTradingTheme(mode: 'light' | 'dark'): Theme {
  return createTheme({
    palette: {
      mode,
      ...(mode === 'dark'
        ? {
            background: { default: '#0e1117', paper: '#161b22' },
            primary: { main: '#58a6ff' },
            success: { main: '#26a69a' },
            error: { main: '#ef5350' },
            divider: 'rgba(240, 246, 252, 0.12)',
          }
        : {
            background: { default: '#f6f8fa', paper: '#ffffff' },
            primary: { main: '#1565c0' },
            success: { main: '#1b8a5a' },
            error: { main: '#d32f2f' },
          }),
    },
    typography: {
      fontSize: 13,
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { fontVariantNumeric: 'tabular-nums' },
        },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
      },
    },
  });
}
