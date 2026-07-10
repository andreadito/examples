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

export function toSx(value: Partial<SxSubset> | null | undefined) {
  if (!value) return undefined;
  const entries = Object.entries(value).filter(([, v]) => v !== null && v !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
}
