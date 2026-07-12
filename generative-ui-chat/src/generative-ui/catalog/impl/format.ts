const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const numberFormatter = new Intl.NumberFormat('en-US');

/** Shared value formatting used by StatTile, DataList, and DataGrid impls. */
export function formatValue(value: unknown, format?: string | null): string {
  switch (format) {
    case 'currency': {
      const n = Number(value);
      return Number.isFinite(n) ? currencyFormatter.format(n) : String(value ?? '');
    }
    case 'percent': {
      const n = Number(value);
      return Number.isFinite(n) ? `${n.toFixed(2)}%` : String(value ?? '');
    }
    case 'number': {
      const n = Number(value);
      return Number.isFinite(n) ? numberFormatter.format(n) : String(value ?? '');
    }
    case 'delta': {
      // Signed, rounded — raw floats (13980.8115362…) read as noise in grids.
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value ?? '');
      return `${n >= 0 ? '+' : ''}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)}`;
    }
    case 'raw':
    default:
      return String(value ?? '');
  }
}
