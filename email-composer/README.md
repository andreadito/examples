# Email Composer

Compose ag-Grid tables and ag-Charts visualizations into a single, email-safe HTML document. Built on top of two sibling rendering engines:

- **email-table** — converts ag-Grid `ColDef[]` + row data into an inline-styled HTML `<table>`
- **email-chart** — converts ag-Charts `AgChartOptions` into a PNG image via Puppeteer

Email Composer orchestrates both engines through a **block renderer registry**, producing a complete HTML email with header, content blocks, and footer — ready to send via any email API.

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

# 3. Open http://localhost:3003 to see the demo email
# 4. Or start the Vite dev UI:
npm run dev
# => http://localhost:5178
```

---

## How It Works

### The Composition Pipeline

```
                                    ┌──────────────┐
                                    │  EmailBlock[] │
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │ composeEmail()│
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
                          │                │                │
                    ┌─────▼─────┐   ┌──────▼──────┐  ┌─────▼─────┐
                    │ HTML table│   │  <img> PNG   │  │  HTML div  │
                    │  string   │   │  data URL    │  │  string    │
                    └─────┬─────┘   └──────┬──────┘  └─────┬─────┘
                          │                │                │
                          └────────────────┼────────────────┘
                                           │
                                    ┌──────▼───────┐
                                    │ wrapEmailHtml │
                                    │  (template)   │
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │  Complete     │
                                    │  email HTML   │
                                    └──────────────┘
```

1. You provide an array of `EmailBlock` objects (tables, charts, text, dividers)
2. `composeEmail()` looks up each block's renderer from the registry
3. All blocks render concurrently — charts via `Promise.all`, sync blocks resolve instantly
4. Rendered HTML fragments are assembled in original order
5. The result is wrapped in an email-safe HTML template (table-based layout, inline styles)

### Why Puppeteer for Charts?

ag-Charts is canvas-based and cannot render in Node.js directly. The chart renderer:

1. Launches a persistent headless Chrome browser (reused across renders)
2. Creates a page, loads the ag-Charts UMD bundle from disk
3. Injects chart options, calls `AgCharts.create()` with animations disabled
4. Calls `chart.getImageDataURL()` to extract the rendered canvas as a PNG
5. Returns the base64 data URL for embedding as `<img src="data:image/png;base64,...">`

This gives pixel-identical output to what you'd see in a browser — all chart types, themes, and features work automatically.

---

## Architecture

### Project Structure

```
email-composer/
├── server/
│   └── index.ts                  # HTTP server (port 3003)
├── src/
│   ├── types/
│   │   └── index.ts              # EmailBlock, EmailTemplateConfig, BlockRenderer
│   ├── engine/
│   │   ├── index.ts              # Public barrel exports
│   │   ├── composeEmail.ts       # Core orchestrator
│   │   ├── htmlWrapper.ts        # Email-safe HTML template
│   │   ├── registry.ts           # Block renderer registry
│   │   └── renderers/
│   │       ├── tableRenderer.ts  # ag-Grid ColDefs → HTML table
│   │       ├── chartRenderer.ts  # ag-Charts options → PNG <img>
│   │       ├── textRenderer.ts   # Raw HTML passthrough
│   │       └── dividerRenderer.ts# <hr> separator
│   ├── demo/
│   │   └── DailyTradingReport.ts # Example: 6-block trading report
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

### `composeEmail(blocks, template?)`

The main function. Takes an array of blocks and an optional template config, returns complete email HTML.

```typescript
import { composeEmail } from './engine';

const result = await composeEmail(
  [
    { type: 'text', html: '<h2>Hello</h2><p>Here is your report.</p>' },
    {
      type: 'chart',
      title: 'Revenue Trend',
      chartOptions: {
        series: [{ type: 'line', xKey: 'month', yKey: 'revenue' }],
        axes: [
          { type: 'category', position: 'bottom' },
          { type: 'number', position: 'left' },
        ],
        data: [
          { month: 'Jan', revenue: 100 },
          { month: 'Feb', revenue: 120 },
          { month: 'Mar', revenue: 145 },
        ],
      },
      width: 600,
      height: 300,
    },
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

### Block Types

#### `TableBlock`

Renders an ag-Grid-style table using `renderToHtml()` from email-table.

```typescript
{
  type: 'table';
  rowData: Record<string, unknown>[];     // Array of row objects
  colDefs: Record<string, unknown>[];     // ag-Grid ColDef array
  title?: string;                         // Optional heading above the table
}
```

The `colDefs` follow the ag-Grid `ColDef` interface: `field`, `headerName`, `width`, `type`, `valueFormatter`, `valueGetter`, `cellStyle`, `cellRenderer`, column groups via `children`, etc.

> **Note:** When sending blocks via the HTTP API (JSON), function-based ColDef properties (`valueFormatter`, `cellRenderer`, etc.) cannot be serialized. Use them only when calling `composeEmail()` directly in Node.js.

#### `ChartBlock`

Renders an ag-Charts visualization as a PNG image via Puppeteer.

```typescript
{
  type: 'chart';
  chartOptions: Record<string, unknown>;  // ag-Charts AgChartOptions (JSON-serializable)
  width?: number;                         // Image width in pixels (default: 800)
  height?: number;                        // Image height in pixels (default: 400)
  title?: string;                         // Optional heading above the chart
}
```

The `chartOptions` object is the standard ag-Charts configuration. Include `data` inside the options object (not separately). All community chart types work: line, bar, area, pie, donut, bubble, scatter, histogram, etc.

> **Limitation:** ag-Charts Enterprise types (candlestick, OHLC, treemap, box-plot, etc.) require an Enterprise license. Function-based options (formatters, stylers) don't survive JSON serialization.

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

### `ComposeResult`

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

---

## HTTP Server

The server exposes two endpoints on port 3003:

### `GET /`

Returns a demo page showing the Daily Trading Report email rendered inline, with block timing breakdown.

### `POST /api/compose`

Compose an email from a JSON payload.

**Request:**

```json
{
  "blocks": [
    { "type": "text", "html": "<h2>Summary</h2><p>Markets up today.</p>" },
    {
      "type": "chart",
      "title": "P&L",
      "chartOptions": {
        "series": [{ "type": "line", "xKey": "x", "yKey": "y" }],
        "data": [{ "x": "A", "y": 10 }, { "x": "B", "y": 20 }]
      },
      "width": 600,
      "height": 300
    },
    {
      "type": "table",
      "colDefs": [{ "field": "name" }, { "field": "value" }],
      "rowData": [{ "name": "Alpha", "value": 100 }]
    }
  ],
  "template": {
    "title": "My Report",
    "headerBgColor": "#1a1a2e"
  }
}
```

**Response:**

```json
{
  "html": "<!DOCTYPE html>...",
  "renderTimeMs": 623,
  "blockResults": [
    { "type": "text", "index": 0, "renderTimeMs": 1 },
    { "type": "chart", "index": 1, "renderTimeMs": 618 },
    { "type": "table", "index": 2, "renderTimeMs": 3 }
  ]
}
```

**cURL example:**

```bash
curl -X POST http://localhost:3003/api/compose \
  -H 'Content-Type: application/json' \
  -d '{
    "blocks": [
      { "type": "text", "html": "<h2>Hello World</h2>" },
      { "type": "divider" }
    ],
    "template": { "title": "Test Email" }
  }'
```

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
  // Your rendering logic here — return an HTML string
  // Could use SVG, canvas-to-image, or any other approach
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

The orchestrator automatically picks up registered renderers by block type name — no changes needed to `composeEmail()`.

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

Typical render times for a 6-block email (2 charts + 2 tables + text + divider):

| Block Type | Render Time |
|------------|-------------|
| Text | ~1-4ms |
| Table | ~1-4ms |
| Divider | ~1ms |
| Chart (first) | ~500-650ms |
| Chart (subsequent) | ~400-600ms |
| **Total** | **~600-700ms** |

Charts are the bottleneck because they require Puppeteer page creation + ag-Charts rendering. The headless browser is persistent (launched once at server startup), so subsequent renders skip the ~2-3s browser launch overhead.

Charts within a single `composeEmail()` call render concurrently via `Promise.all`.

---

## Project Dependencies

| Dependency | Purpose |
|------------|---------|
| `react`, `react-dom` | Table SSR via `renderToStaticMarkup` (email-table) |
| `puppeteer` | Headless Chrome for ag-Charts rendering (email-chart) |
| `ag-charts-community` | Chart library (loaded in Puppeteer, lives in email-chart) |
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
