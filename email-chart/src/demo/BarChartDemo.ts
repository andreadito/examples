// ─── Bar Chart: Quarterly Performance by Region ─────────────────────────────

export const barChartOptions = {
  title: { text: 'Quarterly Revenue by Region' },
  subtitle: { text: '2024 — USD millions' },
  series: [
    { type: 'bar' as const, xKey: 'quarter', yKey: 'northAmerica', yName: 'North America', fill: '#2563eb' },
    { type: 'bar' as const, xKey: 'quarter', yKey: 'emea', yName: 'EMEA', fill: '#16a34a' },
    { type: 'bar' as const, xKey: 'quarter', yKey: 'apac', yName: 'APAC', fill: '#f59e0b' },
  ],
  axes: [
    { type: 'category' as const, position: 'bottom' as const },
    { type: 'number' as const, position: 'left' as const, title: { text: 'Revenue ($M)' } },
  ],
  legend: { position: 'bottom' as const },
};

export const barChartData = [
  { quarter: 'Q1 2024', northAmerica: 42.3, emea: 28.7, apac: 19.1 },
  { quarter: 'Q2 2024', northAmerica: 45.8, emea: 31.2, apac: 22.5 },
  { quarter: 'Q3 2024', northAmerica: 48.7, emea: 34.1, apac: 25.8 },
  { quarter: 'Q4 2024', northAmerica: 52.1, emea: 39.3, apac: 28.4 },
];
