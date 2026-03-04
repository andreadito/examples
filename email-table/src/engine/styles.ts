import type { CSSProperties } from 'react';

// ─── Email-Safe Inline Styles ────────────────────────────────────────────────
// All styles are email-client compatible: no CSS variables, no flexbox/grid,
// no calc(), hex colors only, explicit pixel sizes, email-safe fonts.

export const TABLE_STYLES: CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '13px',
  lineHeight: '1.4',
  color: '#1a1a1a',
  backgroundColor: '#ffffff',
};

export const HEADER_CELL_STYLES: CSSProperties = {
  backgroundColor: '#1e3a5f',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  padding: '10px 12px',
  borderBottom: '2px solid #14294a',
  borderRight: '1px solid #2a5080',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

export const GROUP_HEADER_CELL_STYLES: CSSProperties = {
  ...HEADER_CELL_STYLES,
  backgroundColor: '#264d73',
  textAlign: 'center',
  borderBottom: '1px solid #1e3a5f',
};

export const CELL_STYLES_BASE: CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #e5e7eb',
  borderRight: '1px solid #f0f0f0',
  verticalAlign: 'top',
};

export const CELL_STYLES_ODD: CSSProperties = {
  ...CELL_STYLES_BASE,
  backgroundColor: '#ffffff',
};

export const CELL_STYLES_EVEN: CSSProperties = {
  ...CELL_STYLES_BASE,
  backgroundColor: '#f8f9fa',
};

export const NUMERIC_CELL_OVERRIDE: CSSProperties = {
  textAlign: 'right',
  fontFamily: '"Courier New", Courier, monospace',
};

export const PINNED_LEFT_BORDER: CSSProperties = {
  borderRight: '2px solid #d1d5db',
};

export const PINNED_RIGHT_BORDER: CSSProperties = {
  borderLeft: '2px solid #d1d5db',
};
