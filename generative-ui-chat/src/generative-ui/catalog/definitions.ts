import { z } from 'zod';
import { colorToken, sizeToken, sxSubsetSchema } from './styleTokens';

// `sxSubsetSchema` (Task 4) is already `.object({...}).partial().strict()` —
// do NOT call `.partial()` on it again here, just make the whole prop nullable
// so components can omit `sx` entirely.
const sx = sxSubsetSchema.nullable();
const rows = z.array(z.record(z.string(), z.any()));

// --- Library findings (see catalog.test.ts and task-5-report.md for detail) ---
//
// 1. `catalog.validate(spec)` builds the per-element `props` schema via
//    json-render's `propsOf` schema kind, which resolves to the *literal*
//    Zod schema of a single matching component type ONLY when the catalog
//    has exactly one component type. As soon as a catalog has 2+ component
//    types (as ours does, with 20 core components), `propsOf` can't know
//    which type a given element will be at schema-build time, so it falls
//    back to `z.record(z.string(), z.unknown())` for EVERY element's props,
//    regardless of declared component type. In practice this means
//    `catalog.validate()` does NOT enforce component-specific prop shapes
//    (types, required-ness, or expression positions) once the catalog is
//    non-trivial — it only enforces the element's `type` is a known
//    component name (via a `ref` → `z.enum(componentNames)`), plus the
//    spec's outer shape (root/elements/children/visible). Prop-level
//    correctness (including rejecting expressions in the wrong place) is
//    NOT guaranteed by `catalog.validate()` for multi-component catalogs —
//    it must be enforced elsewhere (e.g. at render time, or with a
//    supplementary per-type check) if that guarantee is needed later.
//    Because of this, `{ $state: '/data/totalPnl' }` in `StatTile.value`
//    (a `z.union([z.string(), z.number()])`) validates successfully — not
//    because the library specially resolves expressions against typed prop
//    unions, but because prop validation is untyped in this configuration.
//
// 2. Independently of (1): the `visible` field on each element is declared
//    via the schema builder's `s.any()`, which is a *required* (non-optional)
//    Zod field. In Zod v4, `z.any()` still requires the key to be present on
//    the input object — omitting it entirely fails with
//    `{ code: 'invalid_type', expected: 'nonoptional' }` even though any
//    *value* (including `null`/`undefined`) is accepted once the key exists.
//    Every element in a hand-built spec must therefore include an explicit
//    `visible` key (e.g. `visible: null`) to pass `catalog.validate()`.
//
// Both of these are load-bearing for Task 9 (generation loop / spec
// assembly): specs must always emit `visible` on every element, and any
// stricter per-component prop validation needed for safety must be layered
// on top of `catalog.validate()` rather than assumed from it.

export const coreDefinitions = {
  Stack: {
    props: z.object({ direction: z.enum(['row', 'column']), gap: z.number().nullable(), wrap: z.boolean().nullable(), sx }),
    slots: ['default'],
    description: 'Flex container. Primary layout primitive; nest freely.',
  },
  Box: {
    props: z.object({ sx }),
    slots: ['default'],
    description: 'Generic container for spacing/width control.',
  },
  Card: {
    props: z.object({ title: z.string().nullable(), subtitle: z.string().nullable(), sx }),
    slots: ['default'],
    description: 'Elevated surface with optional title. Use to group related content.',
  },
  Divider: { props: z.object({}), description: 'Horizontal separator.' },
  Typography: {
    props: z.object({
      text: z.string(),
      variant: z.enum(['h4', 'h5', 'h6', 'subtitle1', 'body1', 'body2', 'caption']).nullable(),
      color: colorToken.nullable(),
      sx,
    }),
    description: 'Text. `text` accepts $state/$template/$computed expressions.',
  },
  Chip: {
    props: z.object({ label: z.string(), color: colorToken.nullable(), size: sizeToken.nullable() }),
    description: 'Small status/label pill.',
  },
  Alert: {
    props: z.object({ severity: z.enum(['success', 'info', 'warning', 'error']), text: z.string() }),
    description: 'Callout banner.',
  },
  LinearProgress: {
    props: z.object({ value: z.number().nullable(), color: colorToken.nullable() }),
    description: 'Progress bar. Omit value for indeterminate.',
  },
  StatTile: {
    props: z.object({
      label: z.string(),
      value: z.union([z.string(), z.number()]),
      format: z.enum(['currency', 'percent', 'number', 'raw']).nullable(),
      delta: z.number().nullable(),
      color: colorToken.nullable(),
      sx,
    }),
    description: 'KPI tile: label + prominent formatted value + optional signed delta (colored green/red).',
  },
  DataList: {
    props: z.object({
      data: rows,
      primaryField: z.string(),
      secondaryField: z.string().nullable(),
      valueField: z.string().nullable(),
      valueFormat: z.enum(['currency', 'percent', 'number', 'raw']).nullable(),
    }),
    description: 'Compact list of rows: primary text, optional secondary, optional right-aligned value.',
  },
  Tabs: {
    props: z.object({ value: z.string(), labels: z.array(z.string()) }),
    slots: ['default'],
    description: 'Tab strip. Bind value with $bindState; show per-tab content using visible conditions on children.',
  },
  Select: {
    props: z.object({ label: z.string().nullable(), value: z.string(), options: z.array(z.object({ value: z.string(), label: z.string() })) }),
    description: 'Dropdown. Bind value with $bindState so other elements can react via $state.',
  },
  Slider: {
    props: z.object({ label: z.string().nullable(), value: z.number(), min: z.number(), max: z.number(), step: z.number().nullable() }),
    description: 'Numeric slider. Bind value with $bindState.',
  },
  ToggleButtonGroup: {
    props: z.object({ value: z.string(), options: z.array(z.object({ value: z.string(), label: z.string() })) }),
    description: 'Exclusive toggle group. Bind value with $bindState.',
  },
  TextField: {
    props: z.object({ label: z.string().nullable(), value: z.string(), placeholder: z.string().nullable() }),
    description: 'Text input. Bind value with $bindState.',
  },
  Switch: {
    props: z.object({ label: z.string().nullable(), checked: z.boolean() }),
    description: 'Boolean toggle. Bind checked with $bindState.',
  },
  Button: {
    props: z.object({ label: z.string(), variant: z.enum(['contained', 'outlined', 'text']).nullable(), color: colorToken.nullable() }),
    description: 'Button. Wire on.press to actions (setState or emit).',
  },
  LineChart: {
    props: z.object({ data: rows, xKey: z.string(), yKeys: z.array(z.string()), height: z.number().nullable(), area: z.boolean().nullable() }),
    description: 'Line chart over an array of row objects (use $state or $computed for data).',
  },
  BarChart: {
    props: z.object({ data: rows, xKey: z.string(), yKeys: z.array(z.string()), height: z.number().nullable(), horizontal: z.boolean().nullable() }),
    description: 'Bar chart. Good with aggregateBy output (xKey "key", yKeys ["value"]).',
  },
  PieChart: {
    props: z.object({ data: rows, labelKey: z.string(), valueKey: z.string(), height: z.number().nullable() }),
    description: 'Pie/donut of category shares.',
  },
  Sparkline: {
    props: z.object({ data: rows, valueKey: z.string(), height: z.number().nullable(), color: colorToken.nullable() }),
    description: 'Tiny inline trend line, no axes.',
  },
  DataGrid: {
    props: z.object({
      data: rows,
      columns: z.array(z.object({
        field: z.string(),
        headerName: z.string().nullable(),
        format: z.enum(['currency', 'percent', 'number', 'delta', 'raw']).nullable(),
        width: z.number().nullable(),
      })),
      height: z.number().nullable(),
      density: z.enum(['compact', 'standard']).nullable(),
    }),
    description: 'Sortable data table (MUI X DataGrid). delta format colors positive green / negative red.',
  },
};
