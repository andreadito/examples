import { createTheme } from '@mui/material';
import type { Theme } from '@mui/material';

/**
 * Terminal theme, Bloomberg-inspired and dark-first.
 *
 * The vernacular of the trading floor: amber accents on near-black
 * (Bloomberg's signature), a teal/red pair for up/down (modern venues —
 * easier on the eyes than saturated web green/red across a long session),
 * monospace data type, and flat 1px-bordered panels — no shadows, no glow.
 * The signature element is the amber tick tab on every panel header with an
 * uppercase letterspaced mono label.
 */

export const MONO = "ui-monospace, 'SF Mono', 'Roboto Mono', 'JetBrains Mono', Menlo, Consolas, monospace";

const AMBER = '#f5a623';
const AMBER_DARK = '#9a6700';
const UP_TEAL = '#2dd4a7';
const UP_TEAL_LIGHT = '#0f8a68';
const DOWN_RED = '#f6465d';
const DOWN_RED_LIGHT = '#d02843';

export function createTradingTheme(mode: 'light' | 'dark'): Theme {
  const dark = mode === 'dark';
  return createTheme({
    // Terminal density: 6px spacing unit (vs MUI's 8) shrinks every sx
    // spacing in generated specs and impls without touching the catalog.
    spacing: 6,
    palette: {
      mode,
      ...(dark
        ? {
            background: { default: '#0a0e13', paper: '#11161d' },
            primary: { main: AMBER },
            secondary: { main: '#8b949e' },
            success: { main: UP_TEAL },
            error: { main: DOWN_RED },
            warning: { main: AMBER },
            text: { primary: '#dde3ea', secondary: '#8b949e' },
            divider: '#1f2630',
          }
        : {
            background: { default: '#f4f5f7', paper: '#ffffff' },
            primary: { main: AMBER_DARK },
            secondary: { main: '#57606a' },
            success: { main: UP_TEAL_LIGHT },
            error: { main: DOWN_RED_LIGHT },
            warning: { main: AMBER_DARK },
            divider: '#d8dee4',
          }),
    },
    shape: { borderRadius: 3 },
    typography: {
      fontSize: 12,
      h4: { fontWeight: 700, fontSize: '1.35rem', letterSpacing: -0.3 },
      h5: { fontWeight: 700, fontSize: '1.1rem', letterSpacing: -0.2 },
      h6: { fontWeight: 600, fontSize: '0.95rem' },
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
      // Flat 1px panels — the terminal look allows no elevation.
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      // Signature: amber tick tab + uppercase mono panel label.
      MuiCardHeader: {
        styleOverrides: {
          root: {
            padding: '7px 12px 5px 9px',
            borderLeft: `3px solid ${dark ? AMBER : AMBER_DARK}`,
          },
          title: {
            fontFamily: MONO,
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: dark ? '#8b949e' : '#57606a',
          },
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
        styleOverrides: {
          root: { borderRadius: 3, fontWeight: 600 },
        },
      },
      MuiButton: {
        defaultProps: { size: 'small', disableElevation: true },
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
          root: {
            minHeight: 36,
            padding: '6px 12px',
            fontSize: '0.6875rem',
            fontFamily: MONO,
            letterSpacing: '0.06em',
          },
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
          root: { padding: '2px 10px', fontSize: '0.75rem', borderRadius: 3 },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: dark
            ? { backgroundColor: '#0a0e13', backgroundImage: 'none', borderBottom: '1px solid #1f2630', boxShadow: 'none' }
            : { backgroundColor: '#1c2128', boxShadow: 'none' },
        },
      },
    },
  });
}
