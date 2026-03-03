import type { PlaceholderReplacer } from '../types';

/**
 * Resolves a dot-separated path against a nested object.
 * e.g. getNestedValue({ market: { price: { last: '$142' } } }, 'market.price.last') → '$142'
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const segment of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Creates a PlaceholderReplacer from any nested context object.
 * Tokens like "market.price.last" are resolved by walking the object tree.
 *
 * @example
 * ```ts
 * const ctx = {
 *   market: { price: { last: '$142.50' } },
 *   position: { quantity: 5000 },
 * };
 * const replacer = buildReplacer(ctx);
 * replacer('market.price.last')  // → '$142.50'
 * replacer('position.quantity')  // → '5000'
 * replacer('unknown.path')       // → undefined
 * ```
 */
export function buildReplacer(contextData: Record<string, unknown>): PlaceholderReplacer {
  return (token: string): string | undefined => {
    const value = getNestedValue(contextData, token);
    if (value === undefined || value === null) return undefined;
    return String(value);
  };
}
