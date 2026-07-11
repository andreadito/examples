import { describe, it, expect } from 'vitest';
import { describeData } from './describeData';

describe('describeData', () => {
  it('summarizes arrays with fields, types, count, and one sample', () => {
    const out = describeData({ positions: [{ symbol: 'AAPL', pnl: 12.3456 }, { symbol: 'MSFT', pnl: -1 }] });
    expect(out).toContain('positions');
    expect(out).toContain('2 rows');
    expect(out).toContain('symbol: string');
    expect(out).toContain('pnl: number');
    expect(out).not.toContain('MSFT'); // only one sample row
  });

  it('summarizes nested records of arrays', () => {
    const out = describeData({ ohlc: { AAPL: [{ time: 't', close: 1 }], MSFT: [{ time: 't', close: 2 }] } });
    expect(out).toContain('/data/ohlc/AAPL');
  });

  it('prepends the human description when provided', () => {
    expect(describeData({ a: [] }, 'Open trading positions')).toContain('Open trading positions');
  });
});
