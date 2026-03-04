// ─── Scatter Chart: Risk vs Return by Fund ───────────────────────────────────

export const scatterChartOptions = {
  title: { text: 'Risk vs Return — Fund Comparison' },
  subtitle: { text: 'Annualized, 3-Year Lookback' },
  series: [
    {
      type: 'bubble' as const,
      xKey: 'volatility',
      xName: 'Volatility (%)',
      yKey: 'returns',
      yName: 'Returns (%)',
      sizeKey: 'aum',
      sizeName: 'AUM ($B)',
      labelKey: 'fund',
      label: { enabled: true },
      marker: { fill: '#2563eb', stroke: '#1d4ed8', fillOpacity: 0.6 },
    },
  ],
  axes: [
    { type: 'number' as const, position: 'bottom' as const, title: { text: 'Volatility (%)' } },
    { type: 'number' as const, position: 'left' as const, title: { text: 'Annualized Return (%)' } },
  ],
};

export const scatterChartData = [
  { fund: 'Alpha Growth', volatility: 18.2, returns: 14.5, aum: 2.4 },
  { fund: 'Beta Value', volatility: 12.1, returns: 9.8, aum: 5.1 },
  { fund: 'Gamma Macro', volatility: 22.5, returns: 18.3, aum: 1.8 },
  { fund: 'Delta Income', volatility: 6.8, returns: 5.2, aum: 8.7 },
  { fund: 'Epsilon Quant', volatility: 15.4, returns: 12.1, aum: 3.2 },
  { fund: 'Zeta EM', volatility: 25.1, returns: 16.7, aum: 1.2 },
  { fund: 'Eta Credit', volatility: 9.3, returns: 7.4, aum: 6.5 },
  { fund: 'Theta Arb', volatility: 8.5, returns: 11.2, aum: 4.3 },
];
