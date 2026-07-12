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

  it('wrappers normalize invalid op/dir instead of failing silently', () => {
    const agg = transformFunctions.aggregateBy({ data: rows, by: 'sector', field: 'pnl', op: 'average' }) as Array<{ key: string; value: number }>;
    expect(agg.find((g) => g.key === 'Tech')?.value).toBe(50); // falls back to sum
    const filtered = transformFunctions.filterBy({ data: rows, field: 'sector', op: 'includes???', value: 'Tech' }) as unknown[];
    expect(filtered).toHaveLength(2); // falls back to eq
    const sorted = transformFunctions.sortBy({ data: rows, field: 'pnl', dir: 'DESCENDING' }) as Array<{ pnl: number }>;
    expect(sorted[0].pnl).toBe(-50); // falls back to asc
  });

  it('wrappers accept model-paraphrased arg aliases (observed live)', () => {
    // aggregateBy called with {key, value} instead of {by, field}
    expect(transformFunctions.aggregateBy({ data: rows, key: 'sector', value: 'pnl' })).toEqual([
      { key: 'Tech', value: 50 },
      { key: 'Energy', value: 30 },
    ]);
    // sortBy called with {key} instead of {field}
    const sorted = transformFunctions.sortBy({ data: rows, key: 'pnl', dir: 'desc' }) as Array<{ pnl: number }>;
    expect(sorted[0].pnl).toBe(100);
    // topN with {limit} instead of {n}
    expect((transformFunctions.topN({ data: rows, field: 'pnl', limit: 1 }) as unknown[])).toHaveLength(1);
    // canonical names still win when both present
    expect(transformFunctions.aggregateBy({ data: rows, by: 'sector', key: 'symbol', field: 'pnl' })).toEqual([
      { key: 'Tech', value: 50 },
      { key: 'Energy', value: 30 },
    ]);
  });

  it('sum returns a scalar total (with field aliases)', () => {
    expect(transformFunctions.sum({ data: rows, field: 'pnl' })).toBe(80);
    expect(transformFunctions.sum({ data: rows, value: 'pnl' })).toBe(80);
    expect(transformFunctions.sum({ data: 'nonsense', field: 'pnl' })).toBe(0);
  });
});
