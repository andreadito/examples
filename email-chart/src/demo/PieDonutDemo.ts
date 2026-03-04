// ─── Donut Chart: Portfolio Allocation by Sector ─────────────────────────────

export const pieDonutOptions = {
  title: { text: 'Portfolio Allocation by Sector' },
  subtitle: { text: 'As of Dec 2024' },
  series: [
    {
      type: 'donut' as const,
      angleKey: 'allocation',
      calloutLabelKey: 'sector',
      sectorLabelKey: 'allocation',
      sectorLabel: { formatter: (params: { value: number }) => `${params.value}%` },
      innerRadiusRatio: 0.6,
      fills: ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'],
      strokes: ['#1e40af', '#15803d', '#b91c1c', '#d97706', '#6d28d9', '#0891b2', '#be185d'],
    },
  ],
  legend: { position: 'right' as const },
};

export const pieDonutData = [
  { sector: 'Technology', allocation: 28 },
  { sector: 'Healthcare', allocation: 18 },
  { sector: 'Financials', allocation: 15 },
  { sector: 'Energy', allocation: 12 },
  { sector: 'Consumer', allocation: 11 },
  { sector: 'Industrials', allocation: 9 },
  { sector: 'Real Estate', allocation: 7 },
];
