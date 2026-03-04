import type { ColDef } from '../types';

// ─── Resolved Types ──────────────────────────────────────────────────────────

export interface ResolvedColumn {
  colDef: ColDef;
  computedWidth: number;
}

export interface HeaderCell {
  headerName: string;
  colspan: number;
  rowspan: number;
}

export interface ResolvedColumns {
  leafColumns: ResolvedColumn[];
  headerRows: HeaderCell[][];
  maxDepth: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function humanize(field: string): string {
  const last = field.includes('.') ? field.split('.').pop()! : field;
  return last
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_.-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Recursively filter out hidden columns and empty groups. */
function filterVisible(defs: ColDef[]): ColDef[] {
  return defs
    .filter((d) => !d.hide)
    .map((d) =>
      d.children ? { ...d, children: filterVisible(d.children) } : d,
    )
    .filter((d) => !d.children || d.children.length > 0);
}

/** Compute the maximum nesting depth. */
function getMaxDepth(defs: ColDef[]): number {
  let max = 1;
  for (const def of defs) {
    if (def.children && def.children.length > 0) {
      max = Math.max(max, 1 + getMaxDepth(def.children));
    }
  }
  return max;
}

/** Count leaf (non-group) descendants. */
function countLeaves(def: ColDef): number {
  if (!def.children || def.children.length === 0) return 1;
  return def.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

/** Recursively walk the tree, building header rows and collecting leaf columns. */
function walk(
  defs: ColDef[],
  depth: number,
  maxDepth: number,
  headerRows: HeaderCell[][],
  leafColumns: ResolvedColumn[],
): void {
  for (const def of defs) {
    if (def.children && def.children.length > 0) {
      // Group header
      headerRows[depth].push({
        headerName: def.headerName ?? '',
        colspan: countLeaves(def),
        rowspan: 1,
      });
      walk(def.children, depth + 1, maxDepth, headerRows, leafColumns);
    } else {
      // Leaf column — spans remaining header rows
      const rowspan = maxDepth - depth;
      headerRows[depth].push({
        headerName: def.headerName ?? (def.field ? humanize(def.field) : ''),
        colspan: 1,
        rowspan,
      });
      leafColumns.push({
        colDef: def,
        computedWidth: def.width ?? 150,
      });
    }
  }
}

// ─── Main Resolver ───────────────────────────────────────────────────────────

const DEFAULT_WIDTH = 150;

export function resolveColumns(columnDefs: ColDef[]): ResolvedColumns {
  const visible = filterVisible(columnDefs);
  const maxDepth = getMaxDepth(visible);

  // Initialize header rows
  const headerRows: HeaderCell[][] = [];
  for (let i = 0; i < maxDepth; i++) headerRows.push([]);

  const leafColumns: ResolvedColumn[] = [];
  walk(visible, 0, maxDepth, headerRows, leafColumns);

  // Distribute flex widths
  const flexCols = leafColumns.filter((c) => c.colDef.flex && !c.colDef.width);
  if (flexCols.length > 0) {
    const fixedTotal = leafColumns
      .filter((c) => !c.colDef.flex || c.colDef.width)
      .reduce((sum, c) => sum + c.computedWidth, 0);
    const remaining = Math.max(0, 800 - fixedTotal); // assume ~800px table
    const totalFlex = flexCols.reduce(
      (sum, c) => sum + (c.colDef.flex ?? 1),
      0,
    );
    for (const col of flexCols) {
      col.computedWidth = Math.max(
        col.colDef.minWidth ?? DEFAULT_WIDTH,
        Math.round((remaining * (col.colDef.flex ?? 1)) / totalFlex),
      );
    }
  }

  return { leafColumns, headerRows, maxDepth };
}
