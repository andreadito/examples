import { describe, it, expect } from 'vitest';
import { buildCatalog } from './buildCatalog';
import { financeExtensions } from './financeExtensions';

describe('finance extensions', () => {
  it('exposes the four finance components', () => {
    expect(financeExtensions.map((e) => e.type).sort()).toEqual(['AdvancedGrid', 'CandlestickChart', 'Heatmap', 'Treemap']);
  });

  it('catalog with finance extensions validates a candlestick spec', () => {
    const catalog = buildCatalog(financeExtensions);
    const spec = {
      root: 'c1',
      elements: {
        c1: { type: 'CandlestickChart', props: { data: { $state: '/data/ohlc/AAPL' }, showVolume: true, height: 320 }, children: [], visible: true },
      },
    };
    expect(catalog.validate(spec).success).toBe(true);
  });

  it('prompt documents finance components', () => {
    const prompt = buildCatalog(financeExtensions).prompt();
    expect(prompt).toContain('CandlestickChart');
    expect(prompt).toContain('AdvancedGrid');
  });
});
