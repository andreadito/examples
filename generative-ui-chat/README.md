# generative-ui-chat

An embeddable React component — `<GenerativeUIChat>` — that lets a user chat
with Claude to build a live-data-bound dashboard in real time. The model
never emits raw HTML/JS: every response is a **json-render spec**, drawn from
a fixed catalog of MUI/AG Grid/ECharts components, bound to your app's data
via `$state` expressions. The spec is validated before it ever reaches the
DOM.

The repo ships both the component (`src/generative-ui`) and a small demo app
(`src/demo`) — a simulated multi-desk trading floor (equity, FX, rates,
credit) with live positions, OHLC history, order-book depth, and a news feed
— that exercises it end to end.

**Integrating this into your own application?** Start with the
[Integration Guide](docs/INTEGRATION.md) — install, proxy setup, quickstart,
full props reference, catalog extension, theming, and troubleshooting.
`npm run build:lib` produces a publish-ready package in `dist-lib/`.

## What it looks like in use

1. Your app passes live data into `<GenerativeUIChat data={...} />`.
2. The user types a request in the chat panel — "Show P&L by sector as a bar
   chart".
3. The component sends the request, the catalog's tool schema, and a
   description of your current data shape to Claude via a small proxy.
4. Claude replies with a `render_ui` tool call containing a complete UI spec.
5. The spec is validated (and, on failure, sent back for one repair attempt).
6. On success, the spec renders on the canvas, live-bound to your data — as
   the data updates, bound values update with it, no further LLM calls
   required.

## Architecture

One catalog definition (`src/generative-ui/catalog/`) compiles to three
things, plus a runtime safety net:

```
                     ┌───────────────────────────┐
                     │   catalog definition       │
                     │ (coreDefinitions + Zod     │
                     │  prop schemas per          │
                     │  component + extensions)   │
                     └─────────────┬───────────────┘
                                   │ buildCatalog()
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
   catalog.jsonSchema()   catalog.prompt()      buildRuntime() registry
   → render_ui tool       → system prompt       → React component map
     input_schema           describing the         (defineRegistry)
                            catalog to Claude

   ┌───────────────────────────────────────────────────────────┐
   │ Browser: generate() generation loop                        │
   │  1. build system prompt + tool schema from the catalog     │
   │  2. POST { system, messages, tools } to the proxy           │
   │  3. normalizeSpec() the tool_use input (visible/etc.)       │
   │  4. createStrictValidator() — per-component prop checks     │
   │     layered on top of catalog.validate()                    │
   │  5. on failure: ONE repair round-trip (tool_result,         │
   │     is_error: true, readable errors) — then give up         │
   └───────────────────────────────────────────────────────────┘
                                   │
                                   ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Express proxy (server/app.ts)                               │
   │  - holds ANTHROPIC_API_KEY server-side only                 │
   │  - pins model (claude-opus-4-8, override via                │
   │    ANTHROPIC_MODEL) and caps max_tokens (16000)              │
   │  - forwards system/messages/tools verbatim to the            │
   │    Anthropic Messages API, returns the raw response          │
   └───────────────────────────────────────────────────────────┘
```

The validated spec renders against a `StateStore` (jotai by default) via
`@json-render/react`'s `Renderer`, inside a `JSONUIProvider` that wires up the
registry, action handlers (`emit`), and data transform functions
(`aggregateBy`/`sortBy`/`filterBy`/`topN`/`pctChange`).

Why the strict validator exists: `catalog.validate()` from `@json-render/core`
only fully enforces per-component prop shapes when a catalog has exactly one
component type. With 20+ core components plus finance extensions, it falls
back to an untyped `z.record` for every element's `props`, silently passing
bad prop keys/values through. `createStrictValidator` (in
`src/generative-ui/llm/strictValidate.ts`) layers real per-prop Zod checks on
top, skipping values that are `$state`/`$computed` expression objects (those
are resolved at render time). `normalizeSpec` fixes up a second library quirk
before validation ever runs: it fills in a missing/`null` `visible` key with
`true`, since an absent key fails `catalog.validate()` and a `null` value
crashes the renderer's visibility check.

## Setup

```bash
cp .env.example .env       # then set ANTHROPIC_API_KEY in .env
npm install
npm run dev                # proxy on :8787, Vite dev server on :5173
```

Open http://localhost:5173. Try prompts like:

- "Build me something cool with this data"
- "Show P&L by sector as a bar chart"
- "Add a candlestick chart for AAPL"
- "Make the chart bigger and add a symbol filter"

`npm run dev` runs the Express proxy (`server/index.ts`, port `8787` by
default, `PORT` env override) and the Vite dev server concurrently; Vite
proxies `/api/*` requests to `:8787` (see `vite.config.ts`), so the browser
never sees the API key.

## Component API

```tsx
import { GenerativeUIChat } from './src/generative-ui';

<GenerativeUIChat
  data={data}
  dataDescription="Live trading positions and per-symbol OHLC history"
  onSpecChange={(spec) => {}}
  onStateChange={(state) => {}}
  onEvent={(name, payload) => {}}
  onError={(error) => {}}
/>;
```

`GenerativeUIChatProps` (`src/generative-ui/GenerativeUIChat.tsx`):

| Prop              | Type                                                     | Default             | Description                                                                 |
| ------------------ | --------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| `data`            | `Record<string, unknown>`                                 | —                    | Live data; written to state under `/data` on every change (new reference required). |
| `dataDescription` | `string?`                                                  | —                    | Prose hint prepended to the auto-generated data description sent to Claude. |
| `stateStore`      | `StateStore?`                                              | fresh `createJotaiStore` | Caller-owned state store, e.g. `createXStateStore(...)`.                    |
| `extensions`      | `CatalogExtension[]?`                                      | `[]`                 | Extra catalog components. `financeExtensions` are always included regardless of this prop. |
| `endpoint`        | `string?`                                                  | `'/api/claude'`      | Proxy endpoint the generation loop calls.                                   |
| `onSpecChange`    | `(spec: object \| null) => void`                            | —                    | Called whenever a new/updated spec renders.                                  |
| `onStateChange`   | `(state: Record<string, unknown>) => void`                 | —                    | Called on every state store mutation (includes `/data` writes).             |
| `onEvent`         | `(name: string, payload?: Record<string, unknown>) => void` | —                    | Called when the rendered UI invokes the `emit` action (buttons, row clicks, etc.). |
| `onError`         | `(error: Error) => void`                                    | —                    | Called on generation/proxy errors and on canvas render errors (error boundary). |

## Extending the catalog

Add a component by pairing a Zod prop schema with a React implementation,
via `defineCatalogComponent` (`src/generative-ui/catalog/extension.ts`).
Follow the shape used by the built-in finance extensions
(`src/generative-ui/catalog/financeExtensions.ts`):

```tsx
import { z } from 'zod';
import { defineCatalogComponent } from './src/generative-ui';

const myGauge = defineCatalogComponent({
  type: 'Gauge',
  definition: {
    props: z.object({
      value: z.number(),
      max: z.number().nullable(),
    }),
    description: 'Radial gauge for a single numeric KPI.',
  },
  component: ({ props }) => <MyGaugeImpl value={props.value} max={props.max ?? 100} />,
});

<GenerativeUIChat data={data} extensions={[myGauge]} />;
```

The component receives `JsonRenderComponentProps` — `props`, `children`,
`emit`, `bindings`, `loading` — and is registered alongside the core catalog
and the always-on finance extensions (`AdvancedGrid`, `CandlestickChart`,
`Heatmap`, `Treemap`). Its `description` is what tells Claude when to reach
for it, so make it specific about the data shape it expects and when to
prefer it over a core component.

## State stores

The default state store is jotai (`createJotaiStore`), created fresh per
`GenerativeUIChat` instance. Swap in XState instead:

```tsx
import { createXStateStore } from './src/generative-ui';

<GenerativeUIChat data={data} stateStore={createXStateStore({ /* initial state */ })} />;
```

Both implement the same `StateStore` interface (re-exported from
`@json-render/core`), so a caller-owned store can be passed in to share state
with the rest of the host app, or to swap the underlying reactivity engine
without touching the catalog or generation loop.

## Data contract

The `data` prop is written to the state store at path `/data` on every
change (mount and every subsequent prop update, using a new object
reference). Generated specs bind to it with `$state` expressions, e.g.
`{ "$state": "/data/positions" }`, and can derive new values with
`$computed` transforms:

- `aggregateBy(data, by, field, op)` — group and aggregate (`sum` / `avg` /
  `min` / `max` / `count`); returns `[{ key, value }]`.
- `sortBy(data, field, dir)` — sort rows ascending/descending.
- `filterBy(data, field, op, value)` — filter rows (`eq` / `neq` / `gt` /
  `lt` / `contains`).
- `topN(data, field, n, dir)` — largest/smallest N rows.
- `pctChange(data, field)` — adds a `pct` field: percent change vs. the
  previous row.

`describeData()` (`src/generative-ui/llm/describeData.ts`) summarizes the
live `/data` shape (field names/types, row counts, one rounded sample row per
array) into the system prompt on every turn, so Claude always has an
up-to-date picture of what it can bind to without the full dataset blowing up
the prompt.

## Testing

```bash
npm test           # vitest unit/integration suite
npm run typecheck  # tsc -b (app) + tsc -p server/tsconfig.json (proxy)
```

## Building the library

```bash
npm run build:lib  # → dist-lib/: ESM bundle + .d.ts types + publish-ready package.json
```

The build externalizes every dependency (consumers bring their own React/MUI/
json-render/etc. as peers), emits type declarations via `tsc -p
tsconfig.lib.json`, and generates `dist-lib/package.json` with peer ranges
copied from this repo's own verified dependency list
(`scripts/make-lib-package.mjs`). `docs/INTEGRATION.md` is copied in as the
package README.

## Known limitations

- **`@mui/x-chat` is alpha** (`^9.0.0-alpha.13`). The `ChatBox`/`ChatAdapter`
  API this component builds on may change in ways that require rework on
  upgrade.
- **`catalog.validate()` from `@json-render/core` under-validates** once a
  catalog has more than one component type — it falls back to an untyped
  `z.record` for element props instead of the component's real Zod schema.
  This is compensated for client-side with `createStrictValidator` (real
  per-prop checks) and `normalizeSpec` (fixes the `visible` key quirk
  described above); it is not a bug in this library's code, but a real gap in
  the current `@json-render/core` behavior worth knowing about before
  relying on `catalog.validate()` alone elsewhere.
- **The Express proxy (`server/app.ts`) is a local dev server, not
  production-hardened**: it enables open CORS (`cors()` with no origin
  allowlist) and has no rate limiting. Do not deploy it as-is — put a real
  origin allowlist and rate limiting (or an API gateway) in front of it
  before exposing it beyond `localhost`.
- **`onEvent` payloads are LLM-authored and must be treated as untrusted
  input.** The generated spec (and therefore any `emit`/`onEvent` payload it
  produces at render time) comes from the model, not your own code — host
  apps should validate/sanitize `onEvent` payloads before using them to drive
  side effects (network calls, navigation, writes) rather than trusting their
  shape or contents.
