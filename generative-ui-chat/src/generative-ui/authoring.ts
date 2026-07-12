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

const DOCUMENT_PREAMBLE = `You author UI specs for a json-render canvas.

OUTPUT FORMAT (complete document):
A spec is ONE JSON object:
  { "root": "<rootKey>", "elements": { "<key>": { "type": "...", "props": { ... }, "children": ["<childKey>"], "visible": true } } }
Always produce the COMPLETE spec document. Never output JSONL, JSON Patch operations, or a partial diff.`;

const DOCUMENT_RULES = [
  'Output exactly ONE JSON object — the complete spec. No prose inside it.',
  'Use ONLY the components listed above. Element keys are unique and descriptive (e.g. "header", "pnl-chart").',
  'Every element needs type, props, and children (an array of element keys). Include "visible": true on every element unless you specifically intend conditional visibility.',
  '"visible", "on", "repeat", and "watch" are ELEMENT fields (siblings of type/props/children) — NEVER inside props.',
  'INTEGRITY: every key referenced in any children array must exist in elements. Walk the tree from root before finishing; a missing child makes that whole branch invisible.',
  'Optional props (marked ? above) may be omitted or passed as null.',
  'Do not invent data. Bind the host\'s live data with {"$state": "/data/..."} expressions, derive with $computed, and bind inputs with $bindState to paths OUTSIDE /data (e.g. /pnlThreshold).',
  "Never bake data values into the spec — the host's data ticks live, and bound values update automatically.",
  'Styling only through documented prop enums and the sx subset — no raw CSS, no classNames.',
];

/**
 * Package the catalog as a portable "skill" so specs can be authored
 * OUTSIDE this component — by a human, a CI pipeline, or a different LLM.
 * The instructions and schema are generated from the same catalog build
 * the canvas renders with, so anything authored against them validates.
 *
 * `catalog.prompt()` targets json-render's streaming JSONL/JSON-Patch
 * dialect; this component renders complete spec documents. We keep the
 * generated reference sections (components, actions, events, visibility,
 * dynamic props, watchers) and replace the streaming preamble and rules
 * with the document contract.
 */
export function createAuthoringContext({ extensions = [], data, dataDescription }: AuthoringContextArgs = {}): AuthoringContext {
  const all = [...financeExtensions, ...extensions];
  const catalog = buildCatalog(all);
  const dataInfo = data !== undefined ? describeData(data, dataDescription) : (dataDescription ?? '');

  const raw = catalog.prompt();
  // Anchor on the section header ("AVAILABLE COMPONENTS (30):"), not the
  // preamble's passing mention of the same words.
  const start = raw.indexOf('AVAILABLE COMPONENTS (');
  const end = raw.indexOf('RULES:');
  // Fall back to the full raw prompt if json-render's section markers ever
  // change — worse instructions beat silently missing ones.
  const reference = start >= 0 && end > start ? raw.slice(start, end).trim() : raw;

  const sections = [
    DOCUMENT_PREAMBLE,
    reference,
    `RULES:\n${DOCUMENT_RULES.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}`,
  ];
  if (dataInfo) sections.push(`LIVE DATA SHAPE (bind these paths):\n${dataInfo}`);

  return { instructions: sections.join('\n\n'), specSchema: catalog.jsonSchema() as object, dataInfo };
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
