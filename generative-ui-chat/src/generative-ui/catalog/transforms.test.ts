import { describe, it, expect } from 'vitest';
import { aggregateBy, sortRows, filterRows, topN, withPctChange, transformFunctions, transformDeclarations } from './transforms';

const rows = [
  { symbol: 'AAPL', sector: 'Tech', pnl: 100, qty: 10 },
  { symbol: 'MSFT', sector: 'Tech', pnl: -50, qty: 5 },
  { symbol: 'XOM', sector: 'Energy', pnl: 30, qty: 8 },
];

describe('transforms', () => {
  it('aggregateBy sums per group', () => {
    expect(aggregateBy(rows, 'sector', 'pnl', 'sum')).toEqual([
      { key: 'Tech', value: 50 },
      { key: 'Energy', value: 30 },
    ]);
  });

  it('aggregateBy supports avg/min/max/count', () => {
    expect(aggregateBy(rows, 'sector', 'pnl', 'avg')).toEqual([
      { key: 'Tech', value: 25 },
      { key: 'Energy', value: 30 },
    ]);
    expect(aggregateBy(rows, 'sector', 'pnl', 'count')).toEqual([
      { key: 'Tech', value: 2 },
      { key: 'Energy', value: 1 },
    ]);
  });

  it('sortRows sorts descending without mutating input', () => {
    const sorted = sortRows(rows, 'pnl', 'desc');
    expect(sorted.map((r) => r.symbol)).toEqual(['AAPL', 'XOM', 'MSFT']);
    expect(rows[0].symbol).toBe('AAPL');
  });

  it('filterRows supports eq/gt/contains', () => {
    expect(filterRows(rows, 'sector', 'eq', 'Tech')).toHaveLength(2);
    expect(filterRows(rows, 'pnl', 'gt', 0)).toHaveLength(2);
    expect(filterRows(rows, 'symbol', 'contains', 'AA')).toHaveLength(1);
  });

  it('topN returns n largest by field', () => {
    expect(topN(rows, 'pnl', 2, 'desc').map((r) => r.symbol)).toEqual(['AAPL', 'XOM']);
  });

  it('withPctChange adds pct field relative to previous row', () => {
    const series = [{ close: 100 }, { close: 110 }, { close: 99 }];
    const out = withPctChange(series, 'close');
    expect(out[0].pct).toBe(0);
    expect(out[1].pct).toBeCloseTo(10);
    expect(out[2].pct).toBeCloseTo(-10);
  });

  it('transformFunctions are callable with args records and tolerate bad input', () => {
    expect(transformFunctions.aggregateBy({ data: rows, by: 'sector', field: 'pnl', op: 'sum' })).toEqual([
      { key: 'Tech', value: 50 },
      { key: 'Energy', value: 30 },
    ]);
    expect(transformFunctions.aggregateBy({ data: 'nonsense' })).toEqual([]);
    expect(Object.keys(transformDeclarations)).toEqual(Object.keys(transformFunctions));
  });
});
