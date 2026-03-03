import { useMemo } from 'react';
import type { PlaceholderReplacer } from '../types';

/**
 * Resolves all placeholder tokens in markdown content.
 * Returns the resolved string + list of unresolved tokens.
 */
export function usePlaceholderResolver(
  markdown: string,
  prefix: string,
  replacer: PlaceholderReplacer,
): { resolved: string; unresolvedCount: number } {
  return useMemo(() => {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escapedPrefix}([a-zA-Z0-9_]+(?:\\.[a-zA-Z0-9_]+)*)`, 'g');
    let unresolvedCount = 0;

    const resolved = markdown.replace(regex, (match, token: string) => {
      const value = replacer(token);
      if (value === undefined) {
        unresolvedCount++;
        return match;
      }
      return value;
    });

    return { resolved, unresolvedCount };
  }, [markdown, prefix, replacer]);
}
