import { describe, it, expect } from 'vitest';
import { sxSubsetSchema, toSx, colorToken, tokenToMuiColor } from './styleTokens';

describe('style tokens', () => {
  it('accepts whitelisted sx fields', () => {
    const parsed = sxSubsetSchema.safeParse({ p: 2, gap: 1, width: '100%', textAlign: 'center' });
    expect(parsed.success).toBe(true);
  });

  it('rejects arbitrary CSS-ish fields', () => {
    expect(sxSubsetSchema.safeParse({ position: 'fixed' }).success).toBe(false);
    expect(sxSubsetSchema.safeParse({ background: 'url(x)' }).success).toBe(false);
  });

  it('toSx strips nulls and returns undefined for empty', () => {
    expect(toSx({ p: 2, gap: null } as never)).toEqual({ p: 2 });
    expect(toSx(null)).toBeUndefined();
    expect(toSx(undefined)).toBeUndefined();
  });

  it('toSx returns undefined for a non-whitelisted shape smuggled past upstream validation', () => {
    expect(toSx({ position: 'fixed' } as never)).toBeUndefined();
  });

  it('colorToken maps to MUI colors', () => {
    expect(colorToken.safeParse('success').success).toBe(true);
    expect(colorToken.safeParse('rebeccapurple').success).toBe(false);
    expect(tokenToMuiColor('default')).toBeUndefined();
    expect(tokenToMuiColor('success')).toBe('success');
  });
});
