# @vaultgradient/generative-ui-chat — Integration Guide

A chat panel + rendering canvas you drop into your React app. Users describe
the UI they want in natural language; Claude generates a **json-render spec
constrained to a component catalog** (never raw HTML/JS); the canvas renders
it bound to **your live data**, which keeps ticking through every generated
view. Follow-up messages edit the existing UI instead of rebuilding it.

The LLM is optional. Specs are plain JSON, and the rendering half ships as
its own component: `GenerativeUICanvas` renders hand-written or externally
generated specs with identical validation and live bindings, and
`createAuthoringContext` exports the catalog contract for authors outside
this library — see [§9](#9-no-llm-required-the-headless-canvas).

```
your data ──► <GenerativeUIChat data={...}>
                    │  chat prompt + data schema + catalog
                    ▼
              /api/claude proxy (yours, holds the API key)
                    │  render_ui tool call (JSON spec)
                    ▼
              validate ► repair (1 retry) ► render ► live bindings
```

---

## 1. Install

```bash
npm install @vaultgradient/generative-ui-chat
```

Peer dependencies (your app provides them — versions in the package manifest):

```bash
npm install react react-dom @mui/material @mui/icons-material \
  @emotion/react @emotion/styled \
  @mui/x-chat @mui/x-charts @mui/x-data-grid \
  @json-render/core @json-render/react @json-render/jotai @json-render/xstate \
  jotai @xstate/store zod ag-grid-community ag-grid-react echarts
```

> `@mui/x-chat` is currently an alpha package — pin it exactly.

## 2. Stand up the proxy (required, ~40 lines)

The component never sees an API key. It POSTs Anthropic Messages-API-shaped
requests (`{ system, messages, tools }`) to an endpoint you host, which
injects the key and pins the model. Express example:

```ts
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

const app = express();
app.use(cors(), express.json({ limit: '2mb' }));

app.post('/api/claude', async (req, res) => {
  const { system, messages, tools, tool_choice, max_tokens } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' });
  }
  try {
    const requested = Number(max_tokens);
    res.json(
      await client.messages.create({
        model: MODEL, // pinned server-side — never accept a client model
        max_tokens: Number.isFinite(requested) && requested > 0 ? Math.min(requested, 16000) : 16000,
        thinking: { type: 'adaptive' },
        ...(system ? { system } : {}),
        messages,
        ...(tools ? { tools } : {}),
        ...(tool_choice ? { tool_choice } : {}),
      }),
    );
  } catch (err) {
    res.status(err?.status ?? 500).json({ error: err?.message ?? 'Upstream error' });
  }
});

app.listen(8787);
```

**Security notes**
- This is a "run anything on your model" oracle: add your own auth, rate
  limiting, and CORS restrictions before exposing it beyond localhost.
- Pin the model and `max_tokens` server-side, always.
- `onEvent` payloads and everything in generated specs are LLM-authored —
  treat them as untrusted input in your handlers.
- Your data's field names and one sample row are included in the prompt via
  the auto-generated data description; don't pass fields you wouldn't show
  the model.

## 3. Drop in the component

```tsx
import { GenerativeUIChat } from '@vaultgradient/generative-ui-chat';

function Workbench() {
  const orders = useMyLiveOrders(); // any array of objects / record of them

  return (
    <div style={{ height: '100vh' }}>
      <GenerativeUIChat
        data={{ orders }}
        dataDescription="Open orders from our OMS, refreshed every second"
        endpoint="/api/claude"
        onSpecChange={(spec) => save(spec)}
        onEvent={(name, payload) => handleUiEvent(name, payload)}
        onError={(err) => report(err)}
      />
    </div>
  );
}
```

Give it an explicit height — it fills its container (canvas left, chat right).

### How data flows

- `data` is a plain record of collections: arrays of objects and/or objects
  with fields. Pass a **new object reference** whenever it changes (a fresh
  `useMemo` result per update is the usual pattern); it's written to the
  state store under `/data` and every generated binding re-renders.
- The model never receives the data itself — a compact schema (keys, types,
  row counts, one sample row) is derived automatically each turn.
- Generated UIs bind by JSON-pointer: `{"$state": "/data/orders"}`.

## 4. Props reference

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `data` | `Record<string, unknown>` | required | Live data, written to `/data` on every reference change |
| `dataDescription` | `string` | — | Prose hint prepended to the auto-generated data schema |
| `endpoint` | `string` | `'/api/claude'` | Your proxy URL |
| `stateStore` | `StateStore` | jotai store | State engine behind bindings; pinned for the component's lifetime |
| `initialSpec` | `object \| null` | — | A stored spec (from `onSpecChange`) to render on mount; validated first, becomes the current spec for follow-up edits |
| `extensions` | `CatalogExtension[]` | `[]` | Extra components the LLM may use (finance set is always included) |
| `debug` | `boolean` | `true` | Show the spec/state inspector toggle on the canvas |
| `onSpecChange` | `(spec) => void` | — | Fires with each newly generated/edited spec (persist these to restore UIs) |
| `onStateChange` | `(state) => void` | — | Fires on every state-store change (inputs, data ticks) |
| `onEvent` | `(name, payload?) => void` | — | Generated Buttons etc. dispatching the `emit` action land here |
| `onError` | `(error) => void` | — | Generation, validation, and render failures |

## 5. What the LLM can build (the catalog)

Layout/display: `Stack, Box, Card, Divider, Typography, Chip, Alert,
LinearProgress, StatTile, DataList, TickerTape, QuoteBoard, OrderBook,
NewsFeed`. Inputs (two-way bound to state): `Tabs, Select, Slider,
ToggleButtonGroup, TextField, Switch, Button`. Charts/tables: `LineChart,
BarChart, PieChart, Sparkline, DataGrid` plus the built-in finance
extensions `AdvancedGrid` (AG Grid), `CandlestickChart`, `Heatmap`,
`Treemap` (ECharts, lazy-loaded).

Data shaping happens through whitelisted transforms the LLM references in
bindings (`$computed`): `sum, aggregateBy, sortBy, filterBy (eq/neq/gt/gte/
lt/lte/contains, live state values), topN, pctChange`. Styling is
token-constrained (theme palette enums + a validated `sx` subset) — no raw
CSS/classNames can be generated.

## 6. Extending the catalog

```tsx
import { defineCatalogComponent } from '@vaultgradient/generative-ui-chat';
import { z } from 'zod';

const gauge = defineCatalogComponent({
  type: 'RiskGauge',
  definition: {
    props: z.object({
      value: z.number(),          // resolved live if the spec binds $state
      max: z.number().nullish(),  // .nullish() for optional keys — models omit what they don't need
      label: z.string().nullish(),
    }),
    description:
      'Radial gauge for a 0..max risk figure. Example: value {"$state":"/data/risk/var"}, max 100.',
  },
  component: ({ props }) => <MyGauge value={Number(props.value) || 0} max={Number(props.max) || 100} />,
});

<GenerativeUIChat data={data} extensions={[gauge]} />;
```

Rules that make extensions work well:
- **Function components only**, receiving `{ props, children, emit, bindings }`;
  props arrive with expressions already resolved.
- The `description` is the model's only documentation — say *when* to use it
  and include a concrete example with real field names.
- Optional props: `.nullish()`, never `.optional()`/`.nullable()` alone.
- Code defensively (`?? []`, `Number(x) || 0`) — prop shapes are validated,
  but models paraphrase.
- Never expose a library's raw config object (an ECharts `option`, a grid
  config) as a prop — wrap an opinionated schema instead.

## 7. State stores (jotai / xstate / custom)

```tsx
import { createXStateStore } from '@vaultgradient/generative-ui-chat';

<GenerativeUIChat data={data} stateStore={createXStateStore({})} />;
```

Default is a fresh jotai store per mount. Anything implementing json-render's
`StateStore` interface (`get/set/update/getSnapshot/subscribe`) works. The
store is pinned for the component's lifetime — to swap engines, remount with
a `key`.

### State management as data (`createStateStore`)

State management is *defined at store creation*: which engine, and what
initial state (flow steps, ticket defaults). That definition is itself plain
JSON, so it can be persisted and versioned exactly like a spec:

```ts
import { createStateStore, type StateStoreConfig } from '@vaultgradient/generative-ui-chat';

const stateConfig: StateStoreConfig = {
  engine: 'xstate',                       // or 'jotai' (default)
  initialState: { flow: { step: 'idle' }, ticket: { qty: 100 } },
};

<GenerativeUICanvas spec={spec} data={data} stateStore={createStateStore(stateConfig)} />;
```

A dev authors `{ spec, stateConfig }` once; your platform stores both; any
runtime rebuilds the identical setup with `createStateStore(stateConfig)`.
To resume a session instead of starting pristine, hydrate with a saved
snapshot: `createStateStore({ ...stateConfig, initialState: savedSnapshot })`.

The store's state *shape* is emergent, by design: `/data/*` comes from your
`data` prop, input paths appear when rendered inputs write them
(`$bindState`), and flow paths are whatever your host code writes. The
`initialState` in the config is where you make the flow-relevant part of
that shape explicit.

## 8. Persisting and restoring UIs (spec + stateConfig + snapshot)

Everything a generated UI *is* lives in plain-JSON documents, all
engine-agnostic. For a full flow that's a triple — the spec (what renders),
the state config (which engine + initial state, §7), and optionally a
snapshot (a session's values):

- **The spec** — the json-render config the model produced. Capture every
  version via `onSpecChange`; store it wherever you like (DB row, document
  store, URL). This is the document to treat as the source of truth.
- **The state snapshot** — one JSON object holding `/data` plus every value
  generated inputs have written (slider thresholds, selected tabs, …).
  Capture it via `onStateChange` (fires on every mutation — throttle before
  writing) or grab it manually from the inspector's STATE tab (copy button).
  The snapshot looks identical whether jotai or xstate is behind it: both
  engines implement the same `StateStore` interface, so persisted state is
  portable between them.

Restore is symmetric — hand the spec back as `initialSpec` and seed a store
with the saved snapshot:

```tsx
const saved = await loadDashboard(id); // { spec, state } you persisted earlier

<GenerativeUIChat
  data={liveData}
  initialSpec={saved.spec}
  stateStore={createJotaiStore(saved.state)} // or createXStateStore(saved.state)
  onSpecChange={(spec) => saveDashboard(id, { spec })}
/>;
```

Notes:
- `initialSpec` goes through the same normalize + strict-validate pipeline
  as a generated spec. A stale spec (e.g. referencing a component you've
  since removed from your extensions) fails loudly through `onError` and
  leaves the canvas empty instead of crashing the renderer.
- The restored spec becomes the current spec, so the next chat prompt edits
  it ("make the chart bigger") rather than starting over.
- Don't persist `/data` values expecting them to stick — the live `data`
  prop overwrites `/data` on mount. Persist state for the *user-input*
  paths; let data stay live.
- Chat history is not part of the persisted pair: a restored session starts
  with a fresh transcript but the full UI.

## 9. No LLM required: the headless canvas

The chat/LLM loop is only one way to produce specs. The rendering half is
its own component — `GenerativeUICanvas` renders **any** catalog-conformant
spec against live data, whether it was written by a human, stored in your
database, or generated by a completely separate AI system:

```tsx
import { GenerativeUICanvas } from '@vaultgradient/generative-ui-chat';

<GenerativeUICanvas
  spec={dashboardSpec}       // hand-written or loaded JSON — controlled prop
  data={{ orders }}          // same live-data contract as the chat component
  onEvent={(name, payload) => handle(name, payload)}
  onError={(err) => report(err)}
  debug                      // optional: same inspector as the chat canvas
/>;
```

Specs go through the exact normalize + strict-validate pipeline the chat
loop uses — an invalid spec fires `onError` with the offending paths and
renders nothing, so hand-authored JSON gets the same safety guarantees as
model output. Bindings, transforms, extensions, theming, and the inspector
all behave identically. (`GenerativeUIChat` is literally this canvas plus a
chat panel.)

**See it live:** the demo app's CHAT/CANVAS toggle (AppBar) swaps the full
chat component for a `GenerativeUICanvas` rendering
`src/demo/handAuthoredSpec.ts` — a hand-written spec with KPI tiles, a
slider-driven live `filterBy` grid, and a sector chart, all bound to the
same ticking desk data. That file doubles as a reference for the authoring
dialect.

`GenerativeUICanvasProps`:

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `spec` | `object \| null` | required | The spec to render (controlled — pass a new one to re-render); validated on every change |
| `data` | `Record<string, unknown>` | required | Live data, written to `/data` — same contract as the chat component |
| `stateStore` | `StateStore` | jotai store | Same as the chat component |
| `extensions` | `CatalogExtension[]` | `[]` | Same as the chat component |
| `debug` | `boolean` | `false` | Inspector toggle (note: default is off here) |
| `emptyHint` | `string` | `'No spec loaded.'` | Message shown while `spec` is null |
| `onStateChange` / `onEvent` / `onError` | — | — | Same semantics as the chat component |

### Authoring specs elsewhere: the portable "skill"

To let an external author — a human writing JSON, or another LLM in a
different system — produce valid specs, hand them the catalog contract:

```ts
import { createAuthoringContext, createSpecValidator } from '@vaultgradient/generative-ui-chat';

const ctx = createAuthoringContext({
  extensions: myExtensions,          // same set the canvas renders with
  data: sampleData,                  // summarized into a bindable data shape
  dataDescription: 'Open orders from our OMS',
});

ctx.instructions; // full catalog reference + binding rules + data shape — an LLM system prompt or human docs
ctx.specSchema;   // JSON Schema for the spec — use as a tool input_schema or with any validator
```

And validate specs wherever they're produced or ingested — CI, an upload
endpoint, a migration script — without rendering anything:

```ts
const validateSpec = createSpecValidator(myExtensions);
const result = validateSpec(candidate);
if (!result.success) reject(result.errors); // readable paths, e.g. "elements.tile.props.label: expected string"
else save(result.spec);                     // normalized (visible/children filled in)
```

Because instructions, schema, and validator are all generated from the same
catalog build the canvas renders with, anything authored against them is
guaranteed to render — there is no second source of truth to drift.

Hand-authoring notes (the same dialect rules the model follows):
- Optional props declared `.nullable()` require the **key to be present**
  (pass `null`); every element needs `visible: true` (the validator's
  normalize step fills it in if omitted).
- Bind data with `{ "$state": "/data/orders" }`, derive with `$computed`
  transforms, and wire interactions via `on`, e.g.
  `on: { press: { action: "emit", params: { name: "submit", payload: null } } }`.

## 10. Theming

Everything renders through your MUI `ThemeProvider` — palette, typography,
density all inherit. The chart/grid wrappers bridge non-MUI renderers: ECharts
re-initializes on palette-mode changes and AG Grid switches color schemes, and
gain/loss coloring uses `palette.success/error`. See the demo's
`src/demo/theme.ts` for a Bloomberg-style terminal theme (dark + light) you
can lift wholesale.

## 11. Debugging integrations

The built-in inspector (`{ }` button on the canvas, `debug` prop) shows the
element tree, every binding with its live resolved value, searchable state,
the raw spec, and a per-turn generation log with validation errors. When a
generated UI misbehaves, the BINDINGS tab almost always names the culprit.

The **STORE tab** is the state-management view: which engine backs the
store (jotai / xstate / custom — tagged automatically by
`createStateStore`/`createJotaiStore`/`createXStateStore`), the initial
state it was configured with, and a live **mutation log** — every state
write as `time · path · old → new`. For an xstate-driven flow this reads as
the transition history; for jotai it's the per-path write history. Live
`/data` ticks are muted by default (toggle to include them) so user
interactions and flow transitions stay visible, and the copy button exports
`{ engine, initialState, mutations }` for a bug report. In production
(`debug={false}` for your readonly users) none of this mounts.

Common integration issues:

| Symptom | Cause / fix |
|---|---|
| 401/500 from endpoint | Proxy can't reach Anthropic — check `ANTHROPIC_API_KEY` server-side |
| UI renders but never updates | `data` prop identity never changes — pass a new object per update |
| "failed validation twice" errors | Read the error in the chat/TURNS tab — usually an extension schema stricter than the model's dialect; loosen with unions/`.nullish()` |
| Empty charts | Binding points at a path that doesn't exist — check BINDINGS tab live values |
| Blank canvas after crash | The ErrorBoundary caught a render error (fired `onError`); ask the chat to fix or rebuild |

## 12. Building the library from this repo

```bash
npm run build:lib   # → dist-lib/ (ESM + types + publish-ready package.json)
cd dist-lib && npm publish --access public   # or point a workspace/file: dep at it
```

For local consumption without publishing: `"@vaultgradient/generative-ui-chat": "file:../generative-ui-chat/dist-lib"`.
