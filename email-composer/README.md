# Email Composer

Compose ag-Grid tables and ag-Charts visualizations into a single, email-safe HTML document. Built on top of two sibling rendering engines:

- **email-table** — converts ag-Grid `ColDef[]` + row data into an inline-styled HTML `<table>`
- **email-chart** — converts ag-Charts `AgChartOptions` into a PNG image via Puppeteer

Email Composer orchestrates both engines through a **block renderer registry**, with built-in **data source resolution** (HTTP + WebSocket), a **pipeline monitoring dashboard**, and a complete HTTP/WebSocket server — producing email HTML ready to send via any email API.

---

## Quick Start

```bash
# 1. Install dependencies (email-composer + sibling projects)
cd email-composer && npm install
cd ../email-table && npm install
cd ../email-chart && npm install

# 2. Start the composition server (launches Puppeteer for chart rendering)
cd ../email-composer
npm run server
# => Email composer server at http://localhost:3003
# => Pipeline monitor at http://localhost:3003/monitor

# 3. Open http://localhost:3003 to see the demo email
# 4. Open http://localhost:3003/monitor to see the pipeline monitor
# 5. Or start the Vite dev UI:
npm run dev
# => http://localhost:5178
```

---

## How It Works

### The Full Pipeline

```
                              ┌──────────────┐
                              │  EmailBlock[] │   Blocks may include dataSource
                              └──────┬───────┘   declarations (HTTP/WebSocket)
                                     │
                           ┌─────────▼──────────┐
                           │ resolveDataSources()│   Phase 1: Fetch data
                           │  (parallel fetch)   │   from remote sources
                           └─────────┬──────────┘
                                     │
                              ┌──────▼───────┐
                              │  Resolved     │   Blocks now have inline data
                              │  EmailBlock[] │   (rowData, chartOptions.data)
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │ composeEmail()│   Phase 2: Render blocks
                              └──────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              ┌─────▼─────┐   ┌──────▼──────┐  ┌─────▼─────┐
              │   table   │   │    chart    │  │text/divider│
              │ renderer  │   │  renderer   │  │  renderer  │
              └─────┬─────┘   └──────┬──────┘  └─────┬─────┘
                    │                │                │
             renderToHtml()   Puppeteer +        pass-through
             (sync, ~4ms)     ag-Charts SSR       (sync, ~1ms)
                    │         (async, ~500ms)         │
                    └────────────────┼────────────────┘
                                     │
                              ┌──────▼───────┐
                              │ wrapEmailHtml │   Phase 3: Assembly
                              │  (template)   │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │  Complete     │
                              │  email HTML   │
                              └──────────────┘
```

1. You provide an array of `EmailBlock` objects — blocks can include inline data or `dataSource` declarations
2. `resolveDataSources()` fetches data from HTTP/WebSocket sources in parallel, injecting results into blocks
3. `composeEmail()` looks up each block's renderer and renders all blocks concurrently
4. Rendered HTML fragments are assembled in original order and wrapped in an email-safe template

---

## Architecture

### Project Structure

```
email-composer/
├── server/
│   ├── index.ts                  # HTTP + WebSocket server (port 3003)
│   ├── demoData.ts               # Mock data generators for demos
│   ├── wsServer.ts               # WebSocket demo server
│   ├── pipeline.ts               # Pipeline orchestrator (job management + SSE)
│   └── monitorPage.ts            # Pipeline monitoring dashboard HTML
├── src/
│   ├── types/
│   │   └── index.ts              # All type definitions
│   ├── engine/
│   │   ├── index.ts              # Public barrel exports
│   │   ├── composeEmail.ts       # Core composition orchestrator
│   │   ├── dataResolver.ts       # Data source resolution service
│   │   ├── htmlWrapper.ts        # Email-safe HTML template
│   │   ├── registry.ts           # Block renderer registry
│   │   └── renderers/
│   │       ├── tableRenderer.ts  # ag-Grid ColDefs → HTML table
│   │       ├── chartRenderer.ts  # ag-Charts options → PNG <img>
│   │       ├── textRenderer.ts   # Raw HTML passthrough
│   │       └── dividerRenderer.ts# <hr> separator
│   ├── demo/
│   │   └── DailyTradingReport.ts # Demo block configurations
│   ├── App.tsx                   # Vite demo UI
│   ├── theme.ts                  # MUI dark theme
│   └── main.tsx                  # React entry
├── package.json
├── tsconfig.json
├── tsconfig.app.json             # Vite/browser compilation
├── tsconfig.server.json          # Server compilation (covers sibling projects)
└── vite.config.ts
```

### Cross-Project Dependencies

```
email-composer/
  └── imports from:
      ├── email-table/src/engine/renderToHtml.ts   (table rendering)
      └── email-chart/server/chartRenderer.ts      (chart rendering via Puppeteer)
```

All imports use relative paths — no npm linking or workspaces required. The projects must live as siblings in the same parent directory.

---

## API Reference

### `composeEmail(blocks, template?, onProgress?)`

The main composition function. Takes blocks, renders them, and returns complete email HTML.

```typescript
import { composeEmail } from './engine';

const result = await composeEmail(
  [
    { type: 'text', html: '<h2>Hello</h2><p>Here is your report.</p>' },
    {
      type: 'table',
      title: 'Details',
      colDefs: [
        { field: 'name', headerName: 'Name' },
        { field: 'value', headerName: 'Value', type: 'numericColumn' },
      ],
      rowData: [
        { name: 'Alpha', value: 100 },
        { name: 'Beta', value: 200 },
      ],
    },
    { type: 'divider' },
  ],
  {
    title: 'Weekly Report',
    subtitle: 'Generated automatically',
    headerBgColor: '#0f172a',
    accentColor: '#3b82f6',
  },
);

console.log(result.html);          // Complete email HTML
console.log(result.renderTimeMs);  // Total render time (ms)
console.log(result.blockResults);  // Per-block timing
```

The optional `onProgress` callback receives `PipelineEvent` objects as each block finishes rendering — used by the pipeline monitor for real-time status.

### `resolveDataSources(blocks, onProgress?)`

Resolves all data sources in blocks in parallel. Blocks without a `dataSource` pass through unchanged.

```typescript
import { resolveDataSources } from './engine';

const blocks = [
  {
    type: 'table',
    colDefs: [{ field: 'name' }, { field: 'price' }],
    dataSource: {
      kind: 'fetch',
      url: 'https://api.example.com/trades',
      transform: 'result.trades',    // dot-path to extract nested data
    },
  },
];

const result = await resolveDataSources(blocks);
// result.resolvedBlocks[0].rowData → [...fetched trade data]
```

### Block Types

#### `TableBlock`

Renders an ag-Grid-style table using `renderToHtml()` from email-table.

```typescript
{
  type: 'table';
  colDefs: Record<string, unknown>[];      // ag-Grid ColDef array
  rowData?: Record<string, unknown>[];     // Inline row data (optional if dataSource provided)
  title?: string;                          // Optional heading above the table
  dataSource?: DataSource;                 // Remote data source (replaces rowData)
}
```

#### `ChartBlock`

Renders an ag-Charts visualization as a PNG image via Puppeteer.

```typescript
{
  type: 'chart';
  chartOptions: Record<string, unknown>;   // ag-Charts options (series, axes, etc.)
  width?: number;                          // Image width in pixels (default: 800)
  height?: number;                         // Image height in pixels (default: 400)
  title?: string;                          // Optional heading above the chart
  dataSource?: DataSource;                 // Remote data source (replaces chartOptions.data)
}
```

#### `TextBlock`

Injects raw HTML into the email body.

```typescript
{
  type: 'text';
  html: string;  // Raw HTML (headings, paragraphs, links, etc.)
}
```

#### `DividerBlock`

Renders a horizontal rule separator.

```typescript
{
  type: 'divider';
  color?: string;  // Border color (defaults to template accentColor)
}
```

### Data Sources

Blocks can declare a `dataSource` to fetch data from a remote endpoint instead of providing inline data. Two kinds are supported:

#### `FetchDataSource` — HTTP

```typescript
{
  kind: 'fetch';
  url: string;               // HTTP URL
  options?: RequestInit;      // Fetch options (headers, method, body, etc.)
  transform?: string;         // Dot-path to extract data, e.g. "result.rows"
}
```

#### `WebSocketDataSource` — WebSocket

Opens a connection, sends a message, waits for one response, then closes.

```typescript
{
  kind: 'websocket';
  url: string;               // WebSocket URL (ws:// or wss://)
  message: unknown;          // JSON-serializable message to send
  transform?: string;         // Dot-path to extract data from response
  timeoutMs?: number;         // Timeout in ms (default: 10000)
}
```

#### How Data Injection Works

The resolver injects fetched data into the appropriate field based on block type:

| Block Type | Data injected into |
|------------|--------------------|
| `table` | `rowData` |
| `chart` | `chartOptions.data` |
| other | `data` property |

The `transform` field uses dot-path notation to extract nested data from the response. For example, if the API returns `{ result: { trades: [...] } }`, set `transform: 'result.trades'` to extract just the array.

### `EmailTemplateConfig`

All fields are optional. Defaults are applied automatically.

| Field | Default | Description |
|-------|---------|-------------|
| `title` | `''` | Email heading in the header |
| `subtitle` | `''` | Secondary text below the title |
| `logoUrl` | `''` | Logo image URL (hosted or base64 data URL) |
| `headerBgColor` | `'#1e293b'` | Header background color |
| `headerTextColor` | `'#ffffff'` | Header text color |
| `footerHtml` | Auto-generated disclaimer | Raw HTML for the footer section |
| `fontFamily` | `'Arial, Helvetica, sans-serif'` | Font stack for the entire email |
| `maxWidth` | `700` | Maximum email width in pixels |
| `bodyBgColor` | `'#f1f5f9'` | Outer background color |
| `contentBgColor` | `'#ffffff'` | Content area background color |
| `accentColor` | `'#2563eb'` | Accent color (dividers, highlights) |

### Result Types

#### `ComposeResult`

```typescript
{
  html: string;                  // Complete email-safe HTML document
  renderTimeMs: number;          // Total composition time in milliseconds
  blockResults: Array<{
    type: string;                // Block type ('table', 'chart', etc.)
    index: number;               // Position in the input array
    renderTimeMs: number;        // Render time for this block
  }>;
}
```

#### `ResolveResult`

```typescript
{
  resolvedBlocks: EmailBlock[];  // Blocks with data injected
  resolveTimeMs: number;         // Total resolution time
  blockResults: Array<{
    index: number;
    type: string;
    hadDataSource: boolean;      // Whether this block had a dataSource
    resolveTimeMs: number;       // Time to resolve this block
    error?: string;              // Error message if resolution failed
  }>;
}
```

---

## HTTP Server

The server runs on port 3003 and provides the following endpoints:

### Pages

| Route | Description |
|-------|-------------|
| `GET /` | Demo page showing the Daily Trading Report email with timing breakdown |
| `GET /monitor` | Pipeline monitoring dashboard with real-time status |

### Composition Endpoints

#### `POST /api/compose`

Compose an email from blocks. Auto-resolves data sources if any blocks have them.

```bash
curl -X POST http://localhost:3003/api/compose \
  -H 'Content-Type: application/json' \
  -d '{
    "blocks": [
      { "type": "text", "html": "<h2>Hello</h2>" },
      {
        "type": "table",
        "colDefs": [{ "field": "name" }, { "field": "value" }],
        "dataSource": {
          "kind": "fetch",
          "url": "http://localhost:3003/api/demo/trades",
          "transform": "result.trades"
        }
      }
    ],
    "template": { "title": "My Report" }
  }'
```

**Response:** `ComposeResult` (html + timing)

#### `POST /api/resolve`

Resolve data sources only (no rendering). Returns blocks with fetched data injected.

```bash
curl -X POST http://localhost:3003/api/resolve \
  -H 'Content-Type: application/json' \
  -d '{ "blocks": [{ "type": "table", "colDefs": [...], "dataSource": { ... } }] }'
```

**Response:** `ResolveResult` (resolved blocks + timing)

### Pipeline Endpoints (for monitoring)

#### `POST /api/pipeline`

Start a pipeline job. Returns immediately with a job ID.

```bash
# Using a preset:
curl -X POST http://localhost:3003/api/pipeline \
  -H 'Content-Type: application/json' \
  -d '{ "preset": "datasource" }'

# Available presets: "full", "datasource", "static", "heavy", "errors", "slow"

# Or provide custom blocks:
curl -X POST http://localhost:3003/api/pipeline \
  -H 'Content-Type: application/json' \
  -d '{ "blocks": [...], "template": { ... } }'
```

**Response:** `{ "jobId": "abc12345" }`

#### `GET /api/pipeline/jobs`

List all active/recent pipeline jobs (within the 5-minute TTL).

```bash
curl http://localhost:3003/api/pipeline/jobs
```

**Response:** Array of job summaries sorted newest-first:

```json
[
  { "id": "a3f2c801", "status": "done", "preset": "heavy", "totalBlocks": 9, "startedAt": 1709500000000, "totalTimeMs": 464 },
  { "id": "bc91d4e2", "status": "running", "preset": "slow", "totalBlocks": 4, "startedAt": 1709500001000 }
]
```

#### `GET /api/pipeline/events`

Global SSE stream — receives events from **all** pipeline jobs. Used by the multi-job monitor dashboard.

```bash
curl -N http://localhost:3003/api/pipeline/events
```

Does not replay old events; only streams live events as they happen. Use `/api/pipeline/jobs` for initial state.

#### `GET /api/pipeline/:jobId/events`

Per-job SSE stream. Replays all stored events, then streams new ones. Used when selecting a specific job in the dashboard.

```bash
curl -N http://localhost:3003/api/pipeline/abc12345/events
```

### Demo Data Endpoints

The server includes mock data endpoints with varying latencies for testing data source resolution and stress testing:

| Route | Latency | Returns |
|-------|---------|---------|
| `GET /api/demo/trades` | 150-350ms | `{ result: { trades: [...] } }` — 8 trade records |
| `GET /api/demo/pnl` | 100-250ms | `{ data: { timeseries: [...] } }` — 14-point P&L series |
| `GET /api/demo/positions` | 500-1000ms | `{ positions: [...] }` — 10 portfolio positions |
| `GET /api/demo/compliance` | 1-2s | `{ checks: [...] }` — 8 compliance rule checks |
| `GET /api/demo/unreliable` | 200ms, ~30% fail | `{ data: [...] }` or HTTP 500 error |

**WebSocket** `ws://localhost:3003` — send `{ "action": "<name>" }`:

| Action | Latency | Returns |
|--------|---------|---------|
| `getRecentTrades` | 150-350ms | `{ result: { trades: [...] } }` |
| `getIntradayPnl` | 100-250ms | `{ data: { timeseries: [...] } }` |
| `getRiskSummary` | 200-500ms | `{ desks: [...] }` |
| `getPositions` | 500-1000ms | `{ positions: [...] }` |
| `getCorrelationMatrix` | 800-1500ms | `{ matrix: [...] }` |
| `getCompliance` | 1-2s | `{ checks: [...] }` |

---

## Pipeline Monitor

The pipeline monitor at `GET /monitor` is a multi-job dashboard providing real-time visibility into all active and recent pipeline runs.

### Features

- **Multi-job tracking** — see all active/recent jobs in a sortable table with status, timing, and relative timestamps
- **Job detail view** — click any job to see its full per-block breakdown
- **Three-phase progress bar** — Resolve → Render → Assemble with per-phase timing
- **Per-block status cards** — shows block type, data source kind, timing, and status (skip/fetching/rendering/done/error)
- **Stuck detection** — blocks in-progress for >15 seconds get a yellow warning indicator
- **Timing summary** — total pipeline time broken down by phase
- **Email preview** — iframe rendering the composed email on completion
- **Global SSE** — single persistent connection receives events from all jobs simultaneously
- **Auto-selection** — new jobs are automatically selected for detail viewing
- **Preset buttons** — one-click demos for various scenarios:
  - **Inline Data** — 6-block trading report with hardcoded data (no resolve phase)
  - **HTTP + WS** — 5 blocks fetching from local HTTP and WebSocket endpoints
  - **Static Only** — blocks without data sources (resolve phase skips all)
  - **Heavy Load** — 9 blocks mixing fast/slow HTTP and WebSocket sources
  - **Errors** — blocks that intentionally fail (unreliable endpoints, bad URLs, unknown WS actions)
  - **Slow Sources** — all slowest endpoints (1-2s) for testing stuck detection
  - **Fire All** — launches 4 presets simultaneously to stress test concurrent execution
  - **Custom JSON** — paste your own block array

### Pipeline Event Types

| Event | When | Key Data |
|-------|------|----------|
| `pipeline:start` | Job begins | `totalBlocks` |
| `resolve:start` | Resolution phase begins | — |
| `resolve:block` | Per-block resolution status | `blockIndex`, `status` (skip/fetching/done/error), `dataSourceKind`, `resolveTimeMs` |
| `resolve:complete` | All blocks resolved | `resolveTimeMs` |
| `render:start` | Render phase begins | — |
| `render:block` | Per-block render status | `blockIndex`, `status` (rendering/done/error), `renderTimeMs` |
| `render:complete` | All blocks rendered | `renderTimeMs` |
| `assembly:start` | HTML assembly begins | — |
| `assembly:complete` | Assembly done | — |
| `pipeline:done` | Pipeline complete | `totalTimeMs`, `html` |
| `pipeline:error` | Pipeline failed | `error` |

---

## Extending with Custom Block Types

The renderer registry makes it trivial to add new component types. Three steps:

### 1. Define the block interface

```typescript
// In types/index.ts, add to the EmailBlock union:
export interface SparklineBlock {
  type: 'sparkline';
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export type EmailBlock =
  | TableBlock
  | ChartBlock
  | TextBlock
  | DividerBlock
  | SparklineBlock   // <-- add here
  | CustomBlock;
```

### 2. Write a renderer

```typescript
// engine/renderers/sparklineRenderer.ts
import type { BlockRenderer, SparklineBlock } from '../../types/index.ts';

export const sparklineRenderer: BlockRenderer<SparklineBlock> = async (block, ctx) => {
  const svg = buildSparklineSvg(block.data, block.width ?? 200, block.height ?? 40, block.color ?? ctx.template.accentColor);
  return `<div style="text-align: center;">${svg}</div>`;
};
```

### 3. Register it

```typescript
// In registry.ts, add to initBuiltinRenderers():
const { sparklineRenderer } = await import('./renderers/sparklineRenderer.ts');
registerBlockRenderer('sparkline', sparklineRenderer);
```

Or register at runtime before calling `composeEmail()`:

```typescript
import { registerBlockRenderer, composeEmail } from './engine';

registerBlockRenderer('sparkline', mySparklineRenderer);
const result = await composeEmail([
  { type: 'sparkline', data: [1, 4, 2, 8, 5, 7] },
]);
```

---

## Email Safety

The output HTML is designed for maximum email client compatibility:

- **Table-based layout** — no CSS flexbox, grid, or floats
- **All styles inline** — no `<style>` blocks, CSS classes, or variables (except a minimal reset in `<head>` for Outlook)
- **Charts as inline images** — `<img src="data:image/png;base64,...">` avoids external image hosting
- **MSO-specific resets** — `mso-table-lspace`, `mso-table-rspace` for Outlook rendering
- **XHTML namespace** — `xmlns="http://www.w3.org/1999/xhtml"` for legacy client compatibility
- **No JavaScript** — static HTML only

---

## Performance

Typical pipeline times by preset:

| Preset | Blocks | Data Sources | Typical Time |
|--------|--------|-------------|--------------|
| Static Only | 6 | None | ~400-900ms |
| HTTP + WS | 5 | 3 (HTTP + WS) | ~500-1000ms |
| Heavy Load | 9 | 7 (fast + slow) | ~1.5-3s |
| Slow Sources | 4 | 3 (all slow) | ~2-4s |
| Errors | 5 | 4 (some fail) | ~300-500ms |

Charts are the bottleneck because they require Puppeteer page creation + ag-Charts rendering. The headless browser is persistent (launched once at server startup), so subsequent renders skip the ~2-3s browser launch overhead.

Both data resolution and block rendering run concurrently via `Promise.all`. Jobs auto-expire from the monitor after 5 minutes.

---

## Project Dependencies

| Dependency | Purpose |
|------------|---------|
| `react`, `react-dom` | Table SSR via `renderToStaticMarkup` (email-table) |
| `puppeteer` | Headless Chrome for ag-Charts rendering (email-chart) |
| `ws` | WebSocket client (data resolution) and demo server |
| `tsx` | TypeScript execution for the server (no build step) |
| `vite` | Dev server for the browser demo UI |
| `@mui/material` | Demo UI components (not used in email output) |

---

## Related Projects

| Project | Port | Purpose |
|---------|------|---------|
| **email-table** | Vite: 5176, SSR: 3001 | ag-Grid ColDefs → email-safe HTML table |
| **email-chart** | Vite: 5177, SSR: 3002 | ag-Charts options → PNG via Puppeteer |
| **email-composer** | Vite: 5178, SSR: 3003 | Orchestrates both into complete emails |
