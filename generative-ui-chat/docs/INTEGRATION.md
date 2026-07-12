# @vaultgradient/generative-ui-chat — Integration Guide

A chat panel + rendering canvas you drop into your React app. Users describe
the UI they want in natural language; Claude generates a **json-render spec
constrained to a component catalog** (never raw HTML/JS); the canvas renders
it bound to **your live data**, which keeps ticking through every generated
view. Follow-up messages edit the existing UI instead of rebuilding it.

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

## 8. Theming

Everything renders through your MUI `ThemeProvider` — palette, typography,
density all inherit. The chart/grid wrappers bridge non-MUI renderers: ECharts
re-initializes on palette-mode changes and AG Grid switches color schemes, and
gain/loss coloring uses `palette.success/error`. See the demo's
`src/demo/theme.ts` for a Bloomberg-style terminal theme (dark + light) you
can lift wholesale.

## 9. Debugging integrations

The built-in inspector (`{ }` button on the canvas, `debug` prop) shows the
element tree, every binding with its live resolved value, searchable state,
the raw spec, and a per-turn generation log with validation errors. When a
generated UI misbehaves, the BINDINGS tab almost always names the culprit.

Common integration issues:

| Symptom | Cause / fix |
|---|---|
| 401/500 from endpoint | Proxy can't reach Anthropic — check `ANTHROPIC_API_KEY` server-side |
| UI renders but never updates | `data` prop identity never changes — pass a new object per update |
| "failed validation twice" errors | Read the error in the chat/TURNS tab — usually an extension schema stricter than the model's dialect; loosen with unions/`.nullish()` |
| Empty charts | Binding points at a path that doesn't exist — check BINDINGS tab live values |
| Blank canvas after crash | The ErrorBoundary caught a render error (fired `onError`); ask the chat to fix or rebuild |

## 10. Building the library from this repo

```bash
npm run build:lib   # → dist-lib/ (ESM + types + publish-ready package.json)
cd dist-lib && npm publish --access public   # or point a workspace/file: dep at it
```

For local consumption without publishing: `"@vaultgradient/generative-ui-chat": "file:../generative-ui-chat/dist-lib"`.
