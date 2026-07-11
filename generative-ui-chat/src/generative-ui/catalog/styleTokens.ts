import { z } from 'zod';

export const colorToken = z.enum(['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info']);
export type ColorToken = z.infer<typeof colorToken>;

export const sizeToken = z.enum(['sm', 'md', 'lg']);

export function tokenToMuiColor(token: ColorToken | null | undefined) {
  return !token || token === 'default' ? undefined : token;
}

// Whitelisted slice of MUI's sx: spacing in theme units, layout fractions,
// alignment, radius. strict() so unknown CSS is rejected, not stripped.
export const sxSubsetSchema = z
  .object({
    p: z.number().nullable(),
    px: z.number().nullable(),
    py: z.number().nullable(),
    mt: z.number().nullable(),
    mb: z.number().nullable(),
    gap: z.number().nullable(),
    width: z.string().nullable(),
    maxWidth: z.string().nullable(),
    height: z.string().nullable(),
    maxHeight: z.string().nullable(),
    flexGrow: z.number().nullable(),
    borderRadius: z.number().nullable(),
    textAlign: z.enum(['left', 'center', 'right']).nullable(),
  })
  .partial()
  .strict();
export type SxSubset = z.infer<typeof sxSubsetSchema>;

/**
 * Defense-in-depth: `sx` values are expected to already be whitelist-checked
 * (`sxSubsetSchema`, via `createStrictValidator`'s `sx`-specific expression
 * rejection — see `llm/strictValidate.ts`) before they ever reach a
 * component implementation. Re-validating here means that even if a
 * non-whitelisted shape is smuggled past that layer (a bug, a caller that
 * skips validation, etc.), the element renders unstyled instead of injecting
 * arbitrary CSS onto the page.
 */
export function toSx(value: Partial<SxSubset> | null | undefined) {
  if (!value) return undefined;
  const parsed = sxSubsetSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const entries = Object.entries(parsed.data).filter(([, v]) => v !== null && v !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
}
