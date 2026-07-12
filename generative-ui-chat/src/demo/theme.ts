import { createTheme } from '@mui/material';
import type { Theme } from '@mui/material';

/**
 * Trading-desk theme, dark-first and terminal-dense. Conventions traders expect:
 * - teal-green gains / soft-red losses (the classic terminal pairing, easier
 *   on the eyes than saturated web green/red during long sessions)
 * - tabular numerals everywhere so ticking prices don't jitter horizontally
 * - compact everything: 6px spacing unit (vs MUI's 8), 12px base type, tight
 *   card/table/input paddings — information density over whitespace
 */
export function createTradingTheme(mode: 'light' | 'dark'): Theme {
  return createTheme({
    // Global density lever: every `sx` spacing unit (p: 2, gap: 1, ...) in
    // generated specs and impls shrinks by 25% without touching the catalog.
    spacing: 6,
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
      fontSize: 12,
      h4: { fontWeight: 700, fontSize: '1.35rem' },
      h5: { fontWeight: 700, fontSize: '1.15rem' },
      h6: { fontWeight: 600, fontSize: '1rem' },
      body1: { fontSize: '0.8125rem' },
      body2: { fontSize: '0.75rem' },
      caption: { fontSize: '0.6875rem' },
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
      MuiCardHeader: {
        styleOverrides: {
          root: { padding: '8px 12px 0 12px' },
          title: { fontSize: '0.875rem', fontWeight: 600 },
          subheader: { fontSize: '0.6875rem' },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: 10, '&:last-child': { paddingBottom: 10 } },
        },
      },
      MuiTable: {
        defaultProps: { size: 'small' },
      },
      MuiTableCell: {
        styleOverrides: {
          sizeSmall: { padding: '3px 8px', fontSize: '0.75rem' },
        },
      },
      MuiChip: {
        defaultProps: { size: 'small' },
      },
      MuiButton: {
        defaultProps: { size: 'small' },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
      },
      MuiToolbar: {
        styleOverrides: {
          dense: { minHeight: 44 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { minHeight: 36, padding: '6px 12px', fontSize: '0.75rem' },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 36 },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: { paddingTop: 1, paddingBottom: 1 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { padding: '2px 10px', fontSize: '0.75rem' },
        },
      },
    },
  });
}
