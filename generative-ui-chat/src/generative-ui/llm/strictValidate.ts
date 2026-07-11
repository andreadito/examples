import type { z } from 'zod';
import { coreDefinitions } from '../catalog/definitions';
import type { CatalogExtension } from '../catalog/extension';

// Matches the shape `coreDefinitions`/`CatalogExtension.definition` already
// use elsewhere (`props: z.ZodObject<z.ZodRawShape>`). Note that `ZodRawShape`
// (= core `$ZodShape`) types `.shape` field values as core `$ZodType`, which
// does NOT expose `.safeParse` at the type level — only the classic
// `ZodType`/`ZodTypeAny` does, even though the *runtime* value (produced by
// `z.string()`, `z.enum()`, etc.) always is a classic `ZodType` instance. We
// cast individual field schemas to `z.ZodTypeAny` at the one call site that
// needs `.safeParse` (below) rather than fighting this typing gap here.
export type PropDefinitions = Record<string, { props: z.ZodObject<z.ZodRawShape> }>;

/** Structural subset of a built catalog needed for envelope validation. */
export interface CatalogLike {
  validate(spec: unknown): { success: boolean; error?: unknown };
}

export interface ValidationResult {
  success: boolean;
  errors: string[];
}

/**
 * Merge the core component prop definitions with any registered extensions,
 * producing the same `{ type -> { props: ZodObject } }` map `buildCatalog`
 * assembles internally. Exposed so callers (the generation loop's strict
 * validator, Task 10's runtime wiring) can build the per-type prop schema
 * lookup without duplicating `buildCatalog`'s merge logic.
 */
export function mergedDefinitions(extensions: CatalogExtension[] = []): PropDefinitions {
  const merged: PropDefinitions = { ...coreDefinitions };
  for (const ext of extensions) {
    merged[ext.type] = ext.definition;
  }
  return merged;
}

function isExpressionObject(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).some((key) => key.startsWith('$'))
  );
}

function issuesToStrings(error: unknown, prefix?: string): string[] {
  if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as { issues: unknown }).issues)
  ) {
    return (error as { issues: Array<{ path?: unknown[]; message: string }> }).issues.map((issue) => {
      const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
      const fullPath = prefix && path ? `${prefix}.${path}` : prefix || path;
      return fullPath ? `${fullPath}: ${issue.message}` : issue.message;
    });
  }
  return [String(error ?? 'validation failed')];
}

interface SpecElement {
  type: string;
  props?: Record<string, unknown>;
}

interface Spec {
  elements: Record<string, SpecElement>;
}

function isSpecShaped(spec: unknown): spec is Spec {
  return (
    typeof spec === 'object' &&
    spec !== null &&
    'elements' in spec &&
    typeof (spec as { elements: unknown }).elements === 'object' &&
    (spec as { elements: unknown }).elements !== null
  );
}

/**
 * `catalog.validate()` only enforces the spec's outer envelope (root,
 * elements map, known component `type` names) once a catalog has 2+
 * component types — it falls back to an untyped `z.record` for every
 * element's `props`, so garbage/unknown prop keys and wrong enum values on a
 * known component pass silently (see catalog/definitions.ts "Library
 * findings"). This validator layers per-component prop-shape checking on
 * top: run the envelope check first, then validate each *present* prop value
 * against that component's declared Zod field — skipping any value that is
 * an expression object (`{ $state: ... }`, `{ $computed: ... }`, etc.),
 * since those are resolved at render time and can legitimately violate a
 * prop's literal type. Missing required props are NOT flagged here:
 * presence heuristics are unreliable once expressions/bindings are in play,
 * so this only validates values that are actually present.
 */
export function createStrictValidator(
  catalog: CatalogLike,
  definitions: PropDefinitions,
): (spec: unknown) => ValidationResult {
  return (spec: unknown): ValidationResult => {
    const envelope = catalog.validate(spec);
    if (!envelope.success) {
      return { success: false, errors: issuesToStrings(envelope.error) };
    }
    if (!isSpecShaped(spec)) {
      return { success: true, errors: [] };
    }

    const errors: string[] = [];
    for (const [elementId, element] of Object.entries(spec.elements)) {
      const def = definitions[element.type];
      if (!def) {
        // Unknown component type: `catalog.validate()` already caught this
        // for elements in the catalog's known set; if it's missing from our
        // merged definitions map too, surface it rather than silently skip.
        errors.push(`elements.${elementId}.type: unknown component "${element.type}"`);
        continue;
      }
      const shape = def.props.shape as Record<string, z.ZodTypeAny | undefined>;
      const props = element.props ?? {};
      for (const [key, value] of Object.entries(props)) {
        if (isExpressionObject(value)) continue;
        const fieldSchema = shape[key];
        if (!fieldSchema) {
          errors.push(`elements.${elementId}.props.${key}: unknown prop on ${element.type}`);
          continue;
        }
        const result = fieldSchema.safeParse(value);
        if (!result.success) {
          const prefix = `elements.${elementId}.props.${key}`;
          errors.push(...issuesToStrings(result.error, prefix));
        }
      }
    }
    return errors.length === 0 ? { success: true, errors: [] } : { success: false, errors };
  };
}
