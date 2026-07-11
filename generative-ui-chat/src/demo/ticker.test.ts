import { describe, it, expect } from 'vitest';
import { createInitialPositions, createInitialOhlc, tick } from './ticker';

describe('ticker', () => {
  it('creates 12 positions with sane fields', () => {
    const positions = createInitialPositions();
    expect(positions).toHaveLength(12);
    for (const p of positions) {
      expect(p.lastPrice).toBeGreaterThan(0);
      expect(p.pnl).toBeCloseTo((p.lastPrice - p.avgPrice) * p.qty, 5);
    }
    expect(new Set(positions.map((p) => p.sector)).size).toBeGreaterThanOrEqual(4);
  });

  it('tick moves prices and keeps pnl consistent', () => {
    const positions = createInitialPositions();
    const ohlc = createInitialOhlc(positions);
    const next = tick(positions, ohlc);
    expect(next.positions).toHaveLength(12);
    for (const p of next.positions) {
      expect(p.pnl).toBeCloseTo((p.lastPrice - p.avgPrice) * p.qty, 5);
    }
    expect(next.ohlc[positions[0].symbol].length).toBeLessThanOrEqual(61);
  });

  it('seeds 60 bars of OHLC history per symbol with high >= low', () => {
    const ohlc = createInitialOhlc(createInitialPositions());
    const bars = ohlc['AAPL'] ?? Object.values(ohlc)[0];
    expect(bars).toHaveLength(60);
    for (const b of bars) expect(b.high).toBeGreaterThanOrEqual(b.low);
  });
});
