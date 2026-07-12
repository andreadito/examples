type Row = Record<string, unknown>;
export type AggOp = 'sum' | 'avg' | 'min' | 'max' | 'count';
export type FilterOp = 'eq' | 'neq' | 'gt' | 'lt' | 'contains';

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const asRows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);

export function aggregateBy(rows: Row[], by: string, field: string, op: AggOp) {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const key = String(row[by]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(num(row[field]));
  }
  return Array.from(groups.entries()).map(([key, values]) => {
    let value: number;
    switch (op) {
      case 'sum': value = values.reduce((a, b) => a + b, 0); break;
      case 'avg': value = values.reduce((a, b) => a + b, 0) / values.length; break;
      case 'min': value = Math.min(...values); break;
      case 'max': value = Math.max(...values); break;
      case 'count': value = values.length; break;
    }
    return { key, value };
  });
}

export function sortRows(rows: Row[], field: string, dir: 'asc' | 'desc' = 'asc') {
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[field], bv = b[field];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
    return String(av).localeCompare(String(bv)) * sign;
  });
}

export function filterRows(rows: Row[], field: string, op: FilterOp, value: unknown) {
  return rows.filter((row) => {
    const v = row[field];
    switch (op) {
      case 'eq': return v === value || String(v) === String(value);
      case 'neq': return v !== value && String(v) !== String(value);
      case 'gt': return num(v) > num(value);
      case 'lt': return num(v) < num(value);
      case 'contains': return String(v).toLowerCase().includes(String(value).toLowerCase());
    }
  });
}

export function topN(rows: Row[], field: string, n: number, dir: 'asc' | 'desc' = 'desc') {
  return sortRows(rows, field, dir).slice(0, Math.max(0, n));
}

export function withPctChange(rows: Row[], field: string) {
  let prev: number | null = null;
  return rows.map((row) => {
    const v = num(row[field]);
    const pct = prev === null || prev === 0 ? 0 : ((v - prev) / prev) * 100;
    prev = v;
    return { ...row, pct };
  });
}

type Args = Record<string, unknown>;

const AGG_OPS: readonly AggOp[] = ['sum', 'avg', 'min', 'max', 'count'];
const FILTER_OPS: readonly FilterOp[] = ['eq', 'neq', 'gt', 'lt', 'contains'];

const asAggOp = (v: unknown): AggOp => (AGG_OPS.includes(v as AggOp) ? (v as AggOp) : 'sum');
const asFilterOp = (v: unknown): FilterOp => (FILTER_OPS.includes(v as FilterOp) ? (v as FilterOp) : 'eq');
const asDir = (v: unknown): 'asc' | 'desc' => (v === 'desc' ? 'desc' : 'asc');

// Models paraphrase arg names despite the documented canon (observed live:
// aggregateBy called with {key, value} instead of {by, field}). Resolve through
// alias chains so a near-miss degrades to the intended call, not a silent no-op.
const arg = (a: Args, ...names: string[]): unknown => {
  for (const n of names) {
    if (a[n] !== undefined && a[n] !== null) return a[n];
  }
  return undefined;
};

export const transformFunctions: Record<string, (args: Args) => unknown> = {
  sum: (a) => {
    const field = String(arg(a, 'field', 'value', 'key') ?? '');
    return asRows(a.data).reduce((total, row) => total + num(row[field]), 0);
  },
  aggregateBy: (a) =>
    aggregateBy(
      asRows(a.data),
      String(arg(a, 'by', 'key', 'groupBy', 'group') ?? ''),
      String(arg(a, 'field', 'value', 'metric') ?? ''),
      asAggOp(a.op),
    ),
  sortBy: (a) => sortRows(asRows(a.data), String(arg(a, 'field', 'key', 'by') ?? ''), asDir(arg(a, 'dir', 'order'))),
  filterBy: (a) =>
    filterRows(asRows(a.data), String(arg(a, 'field', 'key', 'by') ?? ''), asFilterOp(a.op), arg(a, 'value', 'eq')),
  topN: (a) =>
    topN(asRows(a.data), String(arg(a, 'field', 'key', 'by') ?? ''), num(arg(a, 'n', 'count', 'limit') ?? 5), a.dir === 'asc' ? 'asc' : 'desc'),
  pctChange: (a) => withPctChange(asRows(a.data), String(arg(a, 'field', 'key') ?? '')),
};

export const transformDeclarations: Record<string, { description: string }> = {
  sum: {
    description:
      'Sum a numeric field across rows, returning a single number — use for StatTile values. Example: {"$computed":"sum","args":{"data":{"$state":"/data/fx"},"field":"pnl"}}.',
  },
  aggregateBy: {
    description:
      'Group rows and aggregate. Returns [{key, value}]. Example: {"$computed":"aggregateBy","args":{"data":{"$state":"/data/positions"},"by":"sector","field":"pnl","op":"sum"}} (op: sum|avg|min|max|count). Chart it with xKey "key" and yKeys ["value"].',
  },
  sortBy: {
    description:
      'Sort rows. Example: {"$computed":"sortBy","args":{"data":{"$state":"/data/positions"},"field":"pnlPct","dir":"desc"}}.',
  },
  filterBy: {
    description:
      'Filter rows by comparison — op is one of eq, neq, gt, lt, contains, and `value` can be a LIVE state binding (e.g. from a slider or select). Threshold example: {"$computed":"filterBy","args":{"data":{"$state":"/data/positions"},"field":"pnl","op":"gt","value":{"$state":"/pnlThreshold"}}}. Exact-match example: {"$computed":"filterBy","args":{"data":{"$state":"/data/positions"},"field":"sector","op":"eq","value":"Tech"}}.',
  },
  topN: {
    description:
      'Largest/smallest N rows by a numeric field. Example: {"$computed":"topN","args":{"data":{"$state":"/data/positions"},"field":"pnl","n":5,"dir":"desc"}}.',
  },
  pctChange: {
    description:
      'Adds a pct field = percent change of `field` vs previous row. Example: {"$computed":"pctChange","args":{"data":{"$state":"/data/ohlc/AAPL"},"field":"close"}}.',
  },
};
