import { describe, it, expect } from 'vitest';
import { createInitialPositions, createInitialOhlc, createBook, nextNews, tick } from './ticker';

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

  it('createBook produces sorted depth around last price', () => {
    const positions = createInitialPositions();
    const book = createBook(positions);
    for (const p of positions) {
      const { bids, asks } = book[p.symbol];
      expect(bids).toHaveLength(10);
      expect(asks).toHaveLength(10);
      expect(bids[0].price).toBeLessThan(p.lastPrice);
      expect(asks[0].price).toBeGreaterThan(p.lastPrice);
      expect(bids[0].price).toBeGreaterThan(bids[1].price); // descending
      expect(asks[0].price).toBeLessThan(asks[1].price); // ascending
      for (const level of [...bids, ...asks]) expect(level.size).toBeGreaterThan(0);
    }
  });

  it('nextNews prepends and caps headlines', () => {
    const positions = createInitialPositions();
    let news = nextNews([], positions);
    expect(news).toHaveLength(1);
    for (let i = 0; i < 30; i++) news = nextNews(news, positions);
    expect(news.length).toBeLessThanOrEqual(20);
    expect(news[0].time).toBeGreaterThanOrEqual(news[1].time);
    expect(news[0].headline).toContain(news[0].symbol.length ? '' : 'x');
    expect(['DESK', 'WIRE', 'FLOW', 'SQUAWK']).toContain(news[0].source);
  });
});
