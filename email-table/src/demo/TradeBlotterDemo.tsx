import type { ColDef } from '../types';

// ─── Column Definitions ──────────────────────────────────────────────────────

export const tradeBlotterColDefs: ColDef[] = [
  { field: 'tradeId', headerName: 'Trade ID', width: 90 },
  { field: 'instrument', headerName: 'Instrument', width: 100 },
  {
    field: 'side',
    headerName: 'Side',
    width: 70,
    cellRenderer: ({ value }) => {
      const color = value === 'BUY' ? '#16a34a' : '#dc2626';
      return <span style={{ color, fontWeight: 600 }}>{String(value)}</span>;
    },
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    type: 'numericColumn',
    width: 100,
    valueFormatter: ({ value }) =>
      Number(value).toLocaleString('en-US'),
  },
  {
    field: 'price',
    headerName: 'Price',
    type: 'numericColumn',
    width: 100,
    valueFormatter: ({ value }) =>
      '$' + Number(value).toFixed(2),
  },
  {
    headerName: 'Notional',
    type: 'numericColumn',
    width: 120,
    valueGetter: ({ data }) =>
      (data.quantity as number) * (data.price as number),
    valueFormatter: ({ value }) =>
      '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 }),
  },
  {
    field: 'pnl',
    headerName: 'P&L',
    type: 'numericColumn',
    width: 100,
    valueFormatter: ({ value }) => {
      const n = Number(value);
      const prefix = n >= 0 ? '+' : '';
      return prefix + '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });
    },
    cellStyle: ({ value }) => ({
      color: Number(value) >= 0 ? '#16a34a' : '#dc2626',
      fontWeight: 600,
    }),
  },
  {
    field: 'tradeDate',
    headerName: 'Date',
    width: 110,
    valueFormatter: ({ value }) =>
      new Date(value as string).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 90,
    cellRenderer: ({ value }) => {
      const colors: Record<string, string> = {
        Filled: '#16a34a',
        Partial: '#d97706',
        Pending: '#6b7280',
        Cancelled: '#dc2626',
      };
      const color = colors[value as string] ?? '#6b7280';
      return <span style={{ color, fontWeight: 500 }}>{String(value)}</span>;
    },
  },
];

// ─── Row Data ────────────────────────────────────────────────────────────────

export const tradeBlotterData: Record<string, unknown>[] = [
  { tradeId: 'T-001', instrument: 'AAPL', side: 'BUY', quantity: 5000, price: 142.5, pnl: 21500, tradeDate: '2024-12-06', status: 'Filled' },
  { tradeId: 'T-002', instrument: 'MSFT', side: 'SELL', quantity: 3000, price: 415.2, pnl: -8400, tradeDate: '2024-12-06', status: 'Filled' },
  { tradeId: 'T-003', instrument: 'GOOGL', side: 'BUY', quantity: 1500, price: 174.8, pnl: 12750, tradeDate: '2024-12-05', status: 'Filled' },
  { tradeId: 'T-004', instrument: 'NVDA', side: 'BUY', quantity: 2000, price: 138.45, pnl: 45200, tradeDate: '2024-12-05', status: 'Filled' },
  { tradeId: 'T-005', instrument: 'AMZN', side: 'SELL', quantity: 800, price: 227.15, pnl: -3200, tradeDate: '2024-12-04', status: 'Partial' },
  { tradeId: 'T-006', instrument: 'META', side: 'BUY', quantity: 1200, price: 612.3, pnl: 18900, tradeDate: '2024-12-04', status: 'Filled' },
  { tradeId: 'T-007', instrument: 'TSLA', side: 'SELL', quantity: 4000, price: 352.8, pnl: -15600, tradeDate: '2024-12-03', status: 'Filled' },
  { tradeId: 'T-008', instrument: 'JPM', side: 'BUY', quantity: 2500, price: 248.9, pnl: 7250, tradeDate: '2024-12-03', status: 'Pending' },
];
