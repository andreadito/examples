// ─── Stacked Area: Cumulative P&L by Desk ───────────────────────────────────

export const areaChartOptions = {
  title: { text: 'Cumulative P&L by Desk' },
  subtitle: { text: '2024 — USD thousands' },
  series: [
    { type: 'area' as const, xKey: 'month', yKey: 'equitiesDesk', yName: 'Equities Desk', stacked: true, fill: '#2563eb', fillOpacity: 0.6, stroke: '#1d4ed8' },
    { type: 'area' as const, xKey: 'month', yKey: 'ficcDesk', yName: 'FICC Desk', stacked: true, fill: '#16a34a', fillOpacity: 0.6, stroke: '#15803d' },
    { type: 'area' as const, xKey: 'month', yKey: 'fxDesk', yName: 'FX Desk', stacked: true, fill: '#f59e0b', fillOpacity: 0.6, stroke: '#d97706' },
  ],
  axes: [
    { type: 'category' as const, position: 'bottom' as const },
    { type: 'number' as const, position: 'left' as const, title: { text: 'P&L ($K)' } },
  ],
  legend: { position: 'bottom' as const },
};

export const areaChartData = [
  { month: 'Jan', equitiesDesk: 120, ficcDesk: 85, fxDesk: 45 },
  { month: 'Feb', equitiesDesk: 280, ficcDesk: 160, fxDesk: 95 },
  { month: 'Mar', equitiesDesk: 350, ficcDesk: 245, fxDesk: 130 },
  { month: 'Apr', equitiesDesk: 520, ficcDesk: 310, fxDesk: 180 },
  { month: 'May', equitiesDesk: 610, ficcDesk: 420, fxDesk: 225 },
  { month: 'Jun', equitiesDesk: 780, ficcDesk: 490, fxDesk: 290 },
  { month: 'Jul', equitiesDesk: 850, ficcDesk: 580, fxDesk: 340 },
  { month: 'Aug', equitiesDesk: 1020, ficcDesk: 650, fxDesk: 410 },
  { month: 'Sep', equitiesDesk: 1150, ficcDesk: 740, fxDesk: 470 },
  { month: 'Oct', equitiesDesk: 1340, ficcDesk: 830, fxDesk: 540 },
  { month: 'Nov', equitiesDesk: 1480, ficcDesk: 920, fxDesk: 610 },
  { month: 'Dec', equitiesDesk: 1650, ficcDesk: 1050, fxDesk: 690 },
];
