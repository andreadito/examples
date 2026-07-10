# GenerativeUIChat — Design

**Date:** 2026-07-10
**Status:** Approved
**Location:** `~/repos/examples/generative-ui-chat/` (subfolder of this repo)

## Goal

A reusable React component, `<GenerativeUIChat>`, that embeds an MUI X chat panel plus a live rendering canvas. The user chats ("build me something cool with this data"); Claude generates a **json-render spec** constrained to a catalog of real MUI components; the canvas renders the spec and the host's live financial data flows into it via state bindings. The LLM never emits HTML/JS — only a JSON config drawn from the vocabulary we define.

## Key decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Scaffold | Vite React (TS) app + tiny Node server |
| Server role | Dumb proxy that masks the Anthropic API key only |
| Generation loop | Lives in the browser (inside the component) |
| Streaming | None — single-shot JSON; iterate via follow-up chat turns |
| State library | Pluggable `StateStore`; jotai default, xstate optional |
| Catalog scope | Full kit: layout + display + MUI X Charts + DataGrid + inputs |
| Impossible-request handling | Graceful refusal + validation/repair loop (1 retry) + whitelisted data transforms |
| Render UX | Canvas + chat split inside the component; each edit replaces the canvas |
| Demo data | Simulated live ticker (~12 positions, prices random-walk every ~1s) |
| Structure | Single app, component isolated in `src/generative-ui/` for later extraction |

## Project layout

```
generative-ui-chat/
├── package.json            # Vite React app (TS)
├── server/
│   └── index.ts            # Express proxy: POST /api/claude → Anthropic Messages API
├── src/
│   ├── generative-ui/      # THE COMPONENT (extractable later)
│   │   ├── index.ts        # public API: component, types, store factories
│   │   ├── GenerativeUIChat.tsx   # canvas + @mui/x-chat panel
│   │   ├── catalog/        # component defs, registry (MUI impls), transforms
│   │   ├── state/          # createJotaiStore() (default), createXStateStore()
│   │   ├── llm/            # prompt building, tool schema, generation loop, repair
│   │   └── validation/     # spec validation (semantic checks)
│   └── demo/               # dashboard shell + live ticker data generator
```

## Component public API

```tsx
<GenerativeUIChat
  data={positions}                  // array of objects, live — re-renders bindings on change
  dataDescription="Open trading positions"   // optional human hint for the LLM
  stateStore={store}                // optional; default = createJotaiStore(); xstate pluggable
  onSpecChange={(spec) => ...}      // new/updated UI generated (persist, inspect)
  onStateChange={(state) => ...}    // any state change inside the generated UI
  onEvent={(name, payload) => ...}  // catalog actions: onSubmit, onRowClick, custom
  onError={(err) => ...}            // generation/validation/render failures
  endpoint="/api/claude"            // configurable proxy URL
/>
```

- The `data` prop is written into the state store under `data.*`; the LLM binds via
  `$state` paths (e.g. `/data/positions`). Ticker updates → store write → bound
  components re-render. **The spec is a shell; data never lives inside it.**
- `stateStore` follows json-render's `StateStore` interface. `createJotaiStore()`
  (via `@json-render/jotai`) is the default; `createXStateStore()` is provided for
  consumers who prefer xstate. The consumer decides.

## Catalog (the LLM's vocabulary)

Three groups, each entry with description + prop docs:

- **Layout/display:** Stack, Grid, Card, Tabs, Accordion, Divider, Typography, Chip,
  Alert, Avatar, List, LinearProgress, custom `StatTile` (label/value/delta).
- **MUI X:** LineChart, BarChart, PieChart, Sparkline, DataGrid.
- **Inputs:** Select, Slider, ToggleButtonGroup, TextField, Switch, Button — all
  writing to `$state` paths so generated controls can drive generated views.

**Data transforms** (whitelisted, host-executed, memoized): `groupBy`,
`aggregate(sum|avg|min|max|count)`, `sortBy`, `filter`, `topN`, `pctChange`.
The LLM references them in bindings; they expand what "the data can show" without
code generation (e.g. "P&L by sector" → `aggregate(groupBy(data,'sector'),'pnl','sum')`).

**One definition, three artifacts:** each catalog entry compiles into
(1) the `render_ui` tool input schema — hard constraint on what Claude can emit,
(2) the system prompt — descriptions and usage examples, and
(3) the React registry mapping type → real MUI component.
Keeping these generated from one source prevents drift.

## Generation pipeline (browser-side loop)

Server: `POST /api/claude` forwards `{ system, messages, tools, ... }` to the
Anthropic Messages API and returns the raw response. It holds the API key, pins
the allowed model (default `claude-sonnet-5`, overridable via env var, never by
the client) and a `max_tokens` cap server-side (so the endpoint is not a free
general-purpose proxy), and contains zero domain logic.

Client loop, per user turn:

1. Derive `dataSchema` from the live data (keys, types, sample row, row count);
   compile catalog → tool schema + system prompt.
2. Call the proxy with chat history + `currentSpec` (so follow-ups like "make the
   chart bigger" are **edits** to the existing spec, not regenerations).
3. Claude replies with conversational text and/or a `render_ui` tool call.
   Structural validity is guaranteed by the tool schema; the client then validates
   semantics (state paths exist, transform args sane).
4. On semantic errors: one automatic repair call with the errors appended as a
   message. On success: render to canvas + fire `onSpecChange`. On refusal: the
   system prompt instructs Claude to answer in chat with the nearest thing it
   *can* build. On hard failure: honest error message in chat + `onError`.

## Error handling & lifecycle

- Repair loop max 1 retry, then honest error in chat.
- ErrorBoundary around the canvas — a bad spec never takes down the host app.
- Canvas states: empty → generating → rendered / error.
- All failure routes fire `onError`.

## Demo app

Dashboard shell (MUI) with a simulated ticker: ~12 positions
(`symbol, sector, qty, avgPrice, lastPrice, pnl, pnlPct, updatedAt`), prices
random-walking every second. `<GenerativeUIChat>` mounted beside it; callback
invocations logged visibly to demonstrate the lifecycle API.

## Testing

Vitest:
- catalog → tool-schema compilation (snapshot / shape tests)
- transforms (pure function tests)
- spec validation + repair loop with a mocked Claude client
- render smoke test: known-good spec through the registry

Live verification: run demo in browser, generate a UI, watch it tick.

## Dependencies

`@mui/material`, `@mui/x-chat`, `@mui/x-charts`, `@mui/x-data-grid`,
`@json-render/core`, `@json-render/react`, `@json-render/jotai`, `jotai`
(`xstate` + `@json-render/xstate` for the optional store), `express`,
`@anthropic-ai/sdk` (server only), `vite`, `vitest`, `typescript`.
