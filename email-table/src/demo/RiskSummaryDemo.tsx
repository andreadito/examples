import type { ColDef } from '../types';

// ─── Column Definitions ──────────────────────────────────────────────────────

export const riskColDefs: ColDef[] = [
  { field: 'desk', headerName: 'Desk', width: 130, cellStyle: { fontWeight: 600 } },
  {
    field: 'var95',
    headerName: 'VaR (95%)',
    type: 'numericColumn',
    width: 100,
    valueFormatter: ({ value }) =>
      '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 0 }),
  },
  {
    field: 'var99',
    headerName: 'VaR (99%)',
    type: 'numericColumn',
    width: 100,
    valueFormatter: ({ value }) =>
      '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 0 }),
  },
  {
    field: 'expectedShortfall',
    headerName: 'Exp. Shortfall',
    type: 'numericColumn',
    width: 120,
    valueFormatter: ({ value }) =>
      '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 0 }),
  },
  {
    field: 'sharpe',
    headerName: 'Sharpe',
    type: 'numericColumn',
    width: 80,
    valueFormatter: ({ value }) => Number(value).toFixed(2),
  },
  {
    field: 'beta',
    headerName: 'Beta',
    type: 'numericColumn',
    width: 70,
    valueFormatter: ({ value }) => Number(value).toFixed(2),
  },
  {
    field: 'maxDrawdown',
    headerName: 'Max DD',
    type: 'numericColumn',
    width: 80,
    valueFormatter: ({ value }) => Number(value).toFixed(1) + '%',
    cellStyle: () => ({ color: '#dc2626' }),
  },
  {
    field: 'pnlYtd',
    headerName: 'P&L YTD',
    type: 'numericColumn',
    width: 110,
    valueFormatter: ({ value }) => {
      const n = Number(value);
      return (n >= 0 ? '+$' : '-$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0 });
    },
    cellStyle: ({ value }) => ({
      color: Number(value) >= 0 ? '#16a34a' : '#dc2626',
      fontWeight: 600,
    }),
  },
  {
    field: 'limit',
    headerName: 'Limit',
    type: 'numericColumn',
    width: 100,
    valueFormatter: ({ value }) =>
      '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 0 }),
  },
  {
    field: 'utilization',
    headerName: 'Util %',
    type: 'numericColumn',
    width: 80,
    valueFormatter: ({ value }) => Number(value).toFixed(1) + '%',
    cellStyle: ({ value }) => {
      const pct = Number(value);
      if (pct > 90) return { color: '#dc2626', fontWeight: 600 };
      if (pct > 75) return { color: '#d97706', fontWeight: 600 };
      return { color: '#16a34a' };
    },
  },
];

// ─── Row Data ────────────────────────────────────────────────────────────────

export const riskData: Record<string, unknown>[] = [
  { desk: 'Equities L/S', var95: 2140000, var99: 3870000, expectedShortfall: 2910000, sharpe: 1.82, beta: 0.34, maxDrawdown: -4.2, pnlYtd: 12500000, limit: 5000000, utilization: 42.8 },
  { desk: 'Fixed Income', var95: 1580000, var99: 2640000, expectedShortfall: 2100000, sharpe: 1.15, beta: 0.12, maxDrawdown: -2.8, pnlYtd: 8200000, limit: 3000000, utilization: 52.7 },
  { desk: 'FX Trading', var95: 890000, var99: 1520000, expectedShortfall: 1240000, sharpe: 0.94, beta: 0.08, maxDrawdown: -6.1, pnlYtd: -1800000, limit: 2000000, utilization: 44.5 },
  { desk: 'Commodities', var95: 1920000, var99: 3210000, expectedShortfall: 2680000, sharpe: 1.45, beta: 0.52, maxDrawdown: -5.3, pnlYtd: 6700000, limit: 4000000, utilization: 48.0 },
  { desk: 'Credit Trading', var95: 3450000, var99: 5800000, expectedShortfall: 4520000, sharpe: 0.78, beta: 0.67, maxDrawdown: -8.9, pnlYtd: -3400000, limit: 4000000, utilization: 86.3 },
  { desk: 'Event Driven', var95: 2780000, var99: 4600000, expectedShortfall: 3850000, sharpe: 2.14, beta: 0.41, maxDrawdown: -3.7, pnlYtd: 18900000, limit: 3000000, utilization: 92.7 },
];
