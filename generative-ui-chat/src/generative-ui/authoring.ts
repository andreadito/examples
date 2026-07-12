import { buildCatalog } from './catalog/buildCatalog';
import { financeExtensions } from './catalog/financeExtensions';
import type { CatalogExtension } from './catalog/extension';
import { createStrictValidator, mergedDefinitions } from './llm/strictValidate';
import type { ValidationResult } from './llm/strictValidate';
import { normalizeSpec } from './llm/normalizeSpec';
import { describeData } from './llm/describeData';

export interface AuthoringContextArgs {
  /** Extra catalog components, same as GenerativeUIChat's `extensions` prop. */
  extensions?: CatalogExtension[];
  /** The live data shape the spec will bind to (summarized, never sent whole). */
  data?: unknown;
  /** Prose hint prepended to the auto-generated data description. */
  dataDescription?: string;
}

export interface AuthoringContext {
  /**
   * Full authoring instructions: the catalog reference (every component,
   * its props, the transforms, $state/$computed binding rules) plus the
   * data shape. Hand this to an external LLM as its system prompt / skill,
   * or to a human as documentation.
   */
  instructions: string;
  /** JSON Schema every spec must conform to — usable as an LLM tool input_schema or with any schema validator. */
  specSchema: object;
  /** The data-shape summary embedded in the instructions, also exposed separately. */
  dataInfo: string;
}

/**
 * Package the catalog as a portable "skill" so specs can be authored
 * OUTSIDE this component — by a human, a CI pipeline, or a different LLM.
 * The instructions and schema are generated from the same catalog build
 * the canvas renders with, so anything authored against them validates.
 */
export function createAuthoringContext({ extensions = [], data, dataDescription }: AuthoringContextArgs = {}): AuthoringContext {
  const all = [...financeExtensions, ...extensions];
  const catalog = buildCatalog(all);
  const dataInfo = data !== undefined ? describeData(data, dataDescription) : (dataDescription ?? '');
  const customRules = [
    'Author a COMPLETE spec as one JSON document conforming to the provided JSON schema (never a partial diff).',
    dataInfo
      ? `Bind live data via $state expressions under /data. Live data shape:\n${dataInfo}`
      : 'Bind live data via $state expressions under /data.',
    'ALWAYS include "visible": true on every element unless you specifically intend conditional visibility.',
  ];
  return { instructions: catalog.prompt({ customRules }), specSchema: catalog.jsonSchema() as object, dataInfo };
}

export interface SpecValidation extends ValidationResult {
  /** The normalized spec (missing `visible`/`children`/`props` filled in) when valid, else null. */
  spec: object | null;
}

/**
 * Standalone spec validator — the exact normalize + strict-validate pipeline
 * the canvas and the chat loop use, exposed for validating hand-written or
 * externally generated specs before they ever reach a browser (tests, CI,
 * an ingest endpoint). Build it once per extension set and reuse.
 */
export function createSpecValidator(extensions: CatalogExtension[] = []): (spec: unknown) => SpecValidation {
  const all = [...financeExtensions, ...extensions];
  const catalog = buildCatalog(all);
  const validate = createStrictValidator(catalog, mergedDefinitions(all));
  return (spec: unknown): SpecValidation => {
    const normalized = normalizeSpec(spec);
    const result = validate(normalized);
    return { ...result, spec: result.success ? (normalized as object) : null };
  };
}
