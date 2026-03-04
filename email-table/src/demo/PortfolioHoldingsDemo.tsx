import type { ColDef } from '../types';

// ─── Column Definitions (with Column Groups) ────────────────────────────────

export const portfolioColDefs: ColDef[] = [
  { field: 'ticker', headerName: 'Ticker', width: 80, cellStyle: { fontWeight: 600 } },
  { field: 'name', headerName: 'Name', width: 160 },
  { field: 'sector', headerName: 'Sector', width: 110 },
  {
    headerName: 'Position',
    children: [
      {
        field: 'quantity',
        headerName: 'Qty',
        type: 'numericColumn',
        width: 90,
        valueFormatter: ({ value }) => Number(value).toLocaleString('en-US'),
      },
      {
        field: 'avgCost',
        headerName: 'Avg Cost',
        type: 'numericColumn',
        width: 100,
        valueFormatter: ({ value }) => '$' + Number(value).toFixed(2),
      },
    ],
  },
  {
    headerName: 'Market',
    children: [
      {
        field: 'lastPrice',
        headerName: 'Price',
        type: 'numericColumn',
        width: 90,
        valueFormatter: ({ value }) => '$' + Number(value).toFixed(2),
      },
      {
        field: 'marketValue',
        headerName: 'Mkt Value',
        type: 'numericColumn',
        width: 110,
        valueGetter: ({ data }) =>
          (data.quantity as number) * (data.lastPrice as number),
        valueFormatter: ({ value }) =>
          '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 0 }),
      },
    ],
  },
  {
    field: 'pnl',
    headerName: 'Unreal. P&L',
    type: 'numericColumn',
    width: 110,
    valueGetter: ({ data }) =>
      ((data.lastPrice as number) - (data.avgCost as number)) * (data.quantity as number),
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
    field: 'allocation',
    headerName: 'Alloc %',
    type: 'numericColumn',
    width: 80,
    valueFormatter: ({ value }) => Number(value).toFixed(1) + '%',
  },
];

// ─── Row Data ────────────────────────────────────────────────────────────────

export const portfolioData: Record<string, unknown>[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', quantity: 5000, avgCost: 138.2, lastPrice: 142.5, allocation: 18.2 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', quantity: 2000, avgCost: 400.5, lastPrice: 415.2, allocation: 21.3 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', quantity: 1500, avgCost: 165.3, lastPrice: 174.8, allocation: 6.7 },
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', quantity: 3000, avgCost: 235.8, lastPrice: 248.9, allocation: 19.1 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', quantity: 2500, avgCost: 158.4, lastPrice: 152.3, allocation: 9.7 },
  { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy', quantity: 4000, avgCost: 108.7, lastPrice: 104.3, allocation: 10.7 },
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer', quantity: 1800, avgCost: 162.1, lastPrice: 168.5, allocation: 7.8 },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', quantity: 500, avgCost: 125.4, lastPrice: 138.45, allocation: 6.5 },
];
