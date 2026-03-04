// ─── Line Chart: Monthly Revenue by Product Line ────────────────────────────

export const lineChartOptions = {
  title: { text: 'Monthly Revenue by Product Line' },
  subtitle: { text: '2024 — USD millions' },
  series: [
    { type: 'line' as const, xKey: 'month', yKey: 'equities', yName: 'Equities', stroke: '#2563eb', marker: { fill: '#2563eb' } },
    { type: 'line' as const, xKey: 'month', yKey: 'fixedIncome', yName: 'Fixed Income', stroke: '#16a34a', marker: { fill: '#16a34a' } },
    { type: 'line' as const, xKey: 'month', yKey: 'commodities', yName: 'Commodities', stroke: '#dc2626', marker: { fill: '#dc2626' } },
  ],
  axes: [
    { type: 'category' as const, position: 'bottom' as const },
    { type: 'number' as const, position: 'left' as const, title: { text: 'Revenue ($M)' } },
  ],
  legend: { position: 'bottom' as const },
};

export const lineChartData = [
  { month: 'Jan', equities: 12.4, fixedIncome: 8.2, commodities: 5.1 },
  { month: 'Feb', equities: 14.1, fixedIncome: 7.8, commodities: 6.3 },
  { month: 'Mar', equities: 11.8, fixedIncome: 9.1, commodities: 4.7 },
  { month: 'Apr', equities: 15.6, fixedIncome: 8.5, commodities: 7.2 },
  { month: 'May', equities: 13.2, fixedIncome: 10.3, commodities: 5.8 },
  { month: 'Jun', equities: 16.8, fixedIncome: 9.7, commodities: 8.1 },
  { month: 'Jul', equities: 14.5, fixedIncome: 11.2, commodities: 6.9 },
  { month: 'Aug', equities: 18.3, fixedIncome: 10.8, commodities: 7.5 },
  { month: 'Sep', equities: 15.9, fixedIncome: 12.1, commodities: 9.2 },
  { month: 'Oct', equities: 19.2, fixedIncome: 11.5, commodities: 8.8 },
  { month: 'Nov', equities: 17.1, fixedIncome: 13.4, commodities: 10.1 },
  { month: 'Dec', equities: 21.5, fixedIncome: 14.2, commodities: 11.3 },
];
