import type { PlaceholderCategory, PlaceholderDefinition } from '../types';

/**
 * Converts a camelCase or dot-separated key into a human-readable label.
 * e.g. "changePct" → "Change Pct", "last" → "Last"
 */
function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_.-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Recursively collects leaf values from a nested object as placeholder definitions.
 * @param obj    The nested object to walk
 * @param prefix Current dot-path prefix (e.g. "market.price")
 * @param out    Accumulator for collected placeholders
 */
function collectLeaves(
  obj: Record<string, unknown>,
  prefix: string,
  out: PlaceholderDefinition[],
): void {
  for (const [key, value] of Object.entries(obj)) {
    const token = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      collectLeaves(value as Record<string, unknown>, token, out);
    } else {
      // Leaf value — build the last segment(s) for the label
      const segments = token.split('.');
      // Use last 1–2 segments for a readable label
      const labelParts = segments.length > 1 ? segments.slice(1) : segments;
      out.push({
        token,
        label: labelParts.map(humanize).join(' '),
        example: value != null ? String(value) : undefined,
      });
    }
  }
}

/**
 * Auto-generates placeholder categories from any nested context object.
 *
 * Groups by top-level keys. Each top-level key becomes a category,
 * and all nested leaf values become placeholders with auto-generated labels
 * and the current values as examples.
 *
 * @example
 * ```ts
 * const ctx = {
 *   market: { price: { last: '$142.50', bid: '$142.48' }, volume: '12M' },
 *   position: { quantity: 5000, pnl: '+$21,500' },
 * };
 * const categories = buildCategories(ctx);
 * // → [
 * //   { id: 'market', label: 'Market', placeholders: [
 * //     { token: 'market.price.last', label: 'Price Last', example: '$142.50' },
 * //     { token: 'market.price.bid', label: 'Price Bid', example: '$142.48' },
 * //     { token: 'market.volume', label: 'Volume', example: '12M' },
 * //   ]},
 * //   { id: 'position', label: 'Position', placeholders: [
 * //     { token: 'position.quantity', label: 'Quantity', example: '5000' },
 * //     { token: 'position.pnl', label: 'Pnl', example: '+$21,500' },
 * //   ]},
 * // ]
 * ```
 */
export function buildCategories(
  contextData: Record<string, unknown>,
): PlaceholderCategory[] {
  const categories: PlaceholderCategory[] = [];

  for (const [topKey, topValue] of Object.entries(contextData)) {
    const placeholders: PlaceholderDefinition[] = [];

    if (topValue !== null && typeof topValue === 'object' && !Array.isArray(topValue)) {
      collectLeaves(topValue as Record<string, unknown>, topKey, placeholders);
    } else {
      // Top-level leaf — becomes its own single-item category
      placeholders.push({
        token: topKey,
        label: humanize(topKey),
        example: topValue != null ? String(topValue) : undefined,
      });
    }

    categories.push({
      id: topKey,
      label: humanize(topKey),
      placeholders,
    });
  }

  return categories;
}
