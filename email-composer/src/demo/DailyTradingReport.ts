import type { EmailBlock, EmailTemplateConfig } from '../types/index.ts';

// ─── Template ───────────────────────────────────────────────────────────────

export const dailyReportTemplate: EmailTemplateConfig = {
  title: 'Daily Trading Report',
  subtitle: 'March 3, 2026 — End of Day Summary',
  headerBgColor: '#0f172a',
  headerTextColor: '#f8fafc',
  accentColor: '#2563eb',
  footerHtml: `
    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
      This report is for internal use only. All figures are preliminary and subject to reconciliation.
      <br />Generated automatically by the Email Composer engine.
    </p>`,
};

// ─── Blocks ─────────────────────────────────────────────────────────────────

export const dailyReportBlocks: EmailBlock[] = [
  // 1. Market Summary — text block
  {
    type: 'text',
    html: `
      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Market Summary</h2>
      <p style="margin: 0 0 4px 0;">
        Markets closed higher today with broad-based strength across sectors.
        The S&P 500 gained 0.8%, Nasdaq added 1.2%, and the Dow rose 0.5%.
        Treasury yields were flat with the 10Y at 4.28%.
      </p>
      <p style="margin: 0;">
        <strong>Key drivers:</strong> Better-than-expected earnings from tech sector leaders,
        dovish Fed commentary, and improving manufacturing data.
      </p>`,
  },

  // 2. P&L by Desk — line chart
  {
    type: 'chart',
    title: 'Intraday P&L by Desk',
    width: 636,
    height: 300,
    chartOptions: {
      title: { text: 'Intraday P&L by Desk' },
      subtitle: { text: 'Cumulative — USD thousands' },
      series: [
        { type: 'line', xKey: 'time', yKey: 'equities', yName: 'Equities', stroke: '#2563eb', marker: { fill: '#2563eb', size: 4 } },
        { type: 'line', xKey: 'time', yKey: 'fixedIncome', yName: 'Fixed Income', stroke: '#16a34a', marker: { fill: '#16a34a', size: 4 } },
        { type: 'line', xKey: 'time', yKey: 'commodities', yName: 'Commodities', stroke: '#dc2626', marker: { fill: '#dc2626', size: 4 } },
      ],
      axes: [
        { type: 'category', position: 'bottom' },
        { type: 'number', position: 'left', title: { text: 'P&L ($K)' } },
      ],
      legend: { position: 'bottom' },
      data: [
        { time: '09:30', equities: 0, fixedIncome: 0, commodities: 0 },
        { time: '10:00', equities: 45, fixedIncome: 12, commodities: -8 },
        { time: '10:30', equities: 82, fixedIncome: 28, commodities: -15 },
        { time: '11:00', equities: 120, fixedIncome: 35, commodities: 5 },
        { time: '11:30', equities: 95, fixedIncome: 52, commodities: 18 },
        { time: '12:00', equities: 140, fixedIncome: 48, commodities: 32 },
        { time: '12:30', equities: 165, fixedIncome: 61, commodities: 25 },
        { time: '13:00', equities: 198, fixedIncome: 55, commodities: 42 },
        { time: '13:30', equities: 175, fixedIncome: 72, commodities: 38 },
        { time: '14:00', equities: 220, fixedIncome: 68, commodities: 55 },
        { time: '14:30', equities: 245, fixedIncome: 82, commodities: 48 },
        { time: '15:00', equities: 280, fixedIncome: 90, commodities: 62 },
        { time: '15:30', equities: 310, fixedIncome: 95, commodities: 70 },
        { time: '16:00', equities: 342, fixedIncome: 105, commodities: 78 },
      ],
    },
  },

  // 3. Trade Blotter — table block
  {
    type: 'table',
    title: 'Top Trades — Today',
    colDefs: [
      { field: 'tradeId', headerName: 'Trade ID', width: 85 },
      { field: 'instrument', headerName: 'Instrument', width: 95 },
      { field: 'side', headerName: 'Side', width: 60 },
      { field: 'quantity', headerName: 'Qty', type: 'numericColumn', width: 80 },
      { field: 'price', headerName: 'Price', type: 'numericColumn', width: 90 },
      { field: 'pnl', headerName: 'P&L', type: 'numericColumn', width: 90 },
      { field: 'status', headerName: 'Status', width: 80 },
    ],
    rowData: [
      { tradeId: 'T-4201', instrument: 'AAPL', side: 'BUY', quantity: 5000, price: 242.50, pnl: 21500, status: 'Filled' },
      { tradeId: 'T-4202', instrument: 'MSFT', side: 'SELL', quantity: 3000, price: 455.20, pnl: -8400, status: 'Filled' },
      { tradeId: 'T-4203', instrument: 'NVDA', side: 'BUY', quantity: 2000, price: 938.45, pnl: 45200, status: 'Filled' },
      { tradeId: 'T-4204', instrument: 'GOOGL', side: 'BUY', quantity: 1500, price: 194.80, pnl: 12750, status: 'Filled' },
      { tradeId: 'T-4205', instrument: 'AMZN', side: 'SELL', quantity: 800, price: 227.15, pnl: -3200, status: 'Partial' },
      { tradeId: 'T-4206', instrument: 'META', side: 'BUY', quantity: 1200, price: 612.30, pnl: 18900, status: 'Filled' },
      { tradeId: 'T-4207', instrument: 'JPM', side: 'BUY', quantity: 2500, price: 248.90, pnl: 7250, status: 'Pending' },
      { tradeId: 'T-4208', instrument: 'TSLA', side: 'SELL', quantity: 4000, price: 352.80, pnl: -15600, status: 'Filled' },
    ],
  },

  // 4. Divider
  { type: 'divider' },

  // 5. Portfolio Allocation — donut chart
  {
    type: 'chart',
    title: 'Portfolio Allocation by Sector',
    width: 636,
    height: 350,
    chartOptions: {
      title: { text: 'Portfolio Allocation by Sector' },
      subtitle: { text: 'As of EOD' },
      series: [
        {
          type: 'donut',
          angleKey: 'allocation',
          calloutLabelKey: 'sector',
          innerRadiusRatio: 0.6,
          fills: ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'],
          strokes: ['#1e40af', '#15803d', '#b91c1c', '#d97706', '#6d28d9', '#0891b2', '#be185d'],
        },
      ],
      legend: { position: 'right' },
      data: [
        { sector: 'Technology', allocation: 28 },
        { sector: 'Healthcare', allocation: 18 },
        { sector: 'Financials', allocation: 15 },
        { sector: 'Energy', allocation: 12 },
        { sector: 'Consumer', allocation: 11 },
        { sector: 'Industrials', allocation: 9 },
        { sector: 'Real Estate', allocation: 7 },
      ],
    },
  },

  // 6. Risk Summary — table block
  {
    type: 'table',
    title: 'Risk Summary by Desk',
    colDefs: [
      { field: 'desk', headerName: 'Desk', width: 120 },
      { field: 'var95', headerName: 'VaR 95%', type: 'numericColumn', width: 100 },
      { field: 'var99', headerName: 'VaR 99%', type: 'numericColumn', width: 100 },
      { field: 'sharpe', headerName: 'Sharpe', type: 'numericColumn', width: 75 },
      { field: 'pnlYtd', headerName: 'P&L YTD', type: 'numericColumn', width: 110 },
      { field: 'utilization', headerName: 'Util %', type: 'numericColumn', width: 75 },
    ],
    rowData: [
      { desk: 'Equities L/S', var95: '$2.14M', var99: '$3.87M', sharpe: 1.82, pnlYtd: '+$12.5M', utilization: '42.8%' },
      { desk: 'Fixed Income', var95: '$1.58M', var99: '$2.64M', sharpe: 1.15, pnlYtd: '+$8.2M', utilization: '52.7%' },
      { desk: 'FX Trading', var95: '$890K', var99: '$1.52M', sharpe: 0.94, pnlYtd: '-$1.8M', utilization: '44.5%' },
      { desk: 'Commodities', var95: '$1.92M', var99: '$3.21M', sharpe: 1.45, pnlYtd: '+$6.7M', utilization: '48.0%' },
      { desk: 'Credit Trading', var95: '$3.45M', var99: '$5.80M', sharpe: 0.78, pnlYtd: '-$3.4M', utilization: '86.3%' },
      { desk: 'Event Driven', var95: '$2.78M', var99: '$4.60M', sharpe: 2.14, pnlYtd: '+$18.9M', utilization: '92.7%' },
    ],
  },
];
