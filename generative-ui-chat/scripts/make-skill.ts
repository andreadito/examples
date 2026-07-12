import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createAuthoringContext } from '../src/generative-ui/authoring';
import { handAuthoredSpec } from '../src/demo/handAuthoredSpec';

/**
 * Generate a distributable Agent Skill so EXTERNAL LLMs (a Claude Code
 * session, a platform agent, any tool-using model) can author specs for
 * GenerativeUICanvas without this library's chat loop. Everything below is
 * rendered from the same catalog build the canvas renders with — regenerate
 * (`npm run build:skill`) whenever the catalog or extensions change, and the
 * skill can never drift from what actually validates.
 *
 * Output layout (Agent Skills convention):
 *   skill/generative-ui-spec-author/
 *     SKILL.md                     — when to use + authoring workflow + dialect rules
 *     references/catalog.md        — full generated component/transform reference
 *     references/spec-schema.json  — JSON Schema every spec must conform to
 *     references/example-spec.json — a complete, valid, hand-authored example
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const skillDir = path.join(root, 'skill', 'generative-ui-spec-author');
const refsDir = path.join(skillDir, 'references');
mkdirSync(refsDir, { recursive: true });

const ctx = createAuthoringContext();

const SKILL_MD = `---
name: generative-ui-spec-author
description: Author json-render UI specs for @vaultgradient/generative-ui-chat's canvas (GenerativeUICanvas / GenerativeUIChat). Use when asked to create or edit a dashboard, trading UI, or data view that this component will render. The deliverable is always ONE complete JSON spec document — never HTML, JSX, or JavaScript.
---

# Authoring specs for GenerativeUICanvas

You are writing a **spec**: a single JSON document that a host application
renders with \`<GenerativeUICanvas spec={...} data={...} />\`. The spec is
declarative — components from a fixed catalog, bound to the host's live
data. You never write HTML/JSX/JS, and you always output the COMPLETE spec
(when editing, return the whole updated document, not a diff).

## Workflow

1. **Read \`references/catalog.md\`** — the full component and transform
   reference, generated from the exact catalog build that will render your
   spec. Trust it over anything you remember about MUI/AG Grid/ECharts.
2. **Get the data shape.** Specs bind to the host's state tree under
   \`/data/<key>\`. You need: the top-level keys, each key's kind (array of
   rows vs single object), field names/types, and ideally one sample row.
   If the request doesn't include this, ask for it — do not guess field
   names.
3. **Study \`references/example-spec.json\`** — a complete valid spec
   showing layout, live bindings, a transform-driven grid, an interactive
   slider filter, and event wiring.
4. **Write the spec** conforming to \`references/spec-schema.json\`.
5. **Validate if you can run code**: in a project with the library
   installed, \`createSpecValidator()(spec)\` returns
   \`{ success, errors }\` with exact offending paths. Fix and re-run until
   success. If you cannot run code, re-check every rule below before
   returning the spec.

## Dialect rules (violating any of these fails validation)

- **Every element** carries \`"visible": true\` — or a condition object for
  conditional visibility.
- Optional props (marked \`?\` in catalog.md) may be omitted or passed as
  \`null\`. Required props must always be present.
- Bind live data with \`{"$state": "/data/<key>/..."}\`. JSON-pointer
  escaping applies: a key containing \`/\` (e.g. \`BTC/USD\`) becomes
  \`~1\` (\`/data/crypto/bars/BTC~1USD\`).
- Derive values with \`$computed\` — the transforms and their exact JSON
  shapes are in catalog.md. Never precompute results into literals; bind,
  so the UI stays live as data ticks.
- Two-way inputs (Slider, Select, TextField, Tabs, Switch,
  ToggleButtonGroup) bind with \`{"$bindState": "/somePath"}\` — pick paths
  OUTSIDE \`/data\` (e.g. \`/pnlThreshold\`, \`/ticket/qty\`).
- Interactions wire on the ELEMENT (not props):
  \`"on": {"press": {"action": "emit", "params": {"name": "submitOrder", "payload": {"qty": {"$state": "/ticket/qty"}}}}}\`
  — \`emit\` reaches the host application; \`setState\` writes a state path
  directly (good for step/wizard flows). Payload values may be \`$state\`
  expressions; they resolve at click time.
- Styling is token-constrained: only the \`sx\` subset and enum values the
  catalog documents. No raw CSS, no classNames.

## Live data mindset

The host's data ticks continuously. A good spec never contains data values
— only paths and transforms. If a number should update every second, it
must be a binding. StatTile values, chart data, grid rows: all bindings or
\`$computed\` over bindings.

## Output contract

Return the spec as a single JSON code block (or write it to the requested
file). No surrounding prose inside the JSON, no comments, no trailing
commas.
`;

writeFileSync(path.join(skillDir, 'SKILL.md'), SKILL_MD);
writeFileSync(
  path.join(refsDir, 'catalog.md'),
  `# Catalog reference (generated — do not edit)\n\nRegenerate with \`npm run build:skill\` after catalog changes.\n\n${ctx.instructions}\n`,
);
writeFileSync(path.join(refsDir, 'spec-schema.json'), `${JSON.stringify(ctx.specSchema, null, 2)}\n`);
writeFileSync(path.join(refsDir, 'example-spec.json'), `${JSON.stringify(handAuthoredSpec, null, 2)}\n`);

console.log(`skill written to ${path.relative(root, skillDir)}`);
console.log(`  catalog.md: ${ctx.instructions.length.toLocaleString()} chars`);
console.log(`  spec-schema.json: ${JSON.stringify(ctx.specSchema).length.toLocaleString()} chars`);
