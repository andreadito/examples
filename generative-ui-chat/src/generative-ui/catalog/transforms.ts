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

export const transformFunctions: Record<string, (args: Args) => unknown> = {
  aggregateBy: (a) => aggregateBy(asRows(a.data), String(a.by ?? ''), String(a.field ?? ''), asAggOp(a.op)),
  sortBy: (a) => sortRows(asRows(a.data), String(a.field ?? ''), asDir(a.dir)),
  filterBy: (a) => filterRows(asRows(a.data), String(a.field ?? ''), asFilterOp(a.op), a.value),
  topN: (a) => topN(asRows(a.data), String(a.field ?? ''), num(a.n ?? 5), a.dir === 'asc' ? 'asc' : 'desc'),
  pctChange: (a) => withPctChange(asRows(a.data), String(a.field ?? '')),
};

export const transformDeclarations: Record<string, { description: string }> = {
  aggregateBy: { description: 'Group rows and aggregate. args: data (array expression), by (group field), field (numeric field), op (sum|avg|min|max|count). Returns [{key, value}].' },
  sortBy: { description: 'Sort rows. args: data (array expression), field, dir (asc|desc). Returns sorted array.' },
  filterBy: { description: 'Filter rows. args: data (array expression), field, op (eq|neq|gt|lt|contains), value. Returns filtered array.' },
  topN: { description: 'Largest/smallest N rows. args: data (array expression), field (numeric), n, dir (asc|desc). Returns array.' },
  pctChange: { description: 'Adds a pct field = percent change of `field` vs previous row. args: data (array expression), field. Returns array.' },
};
