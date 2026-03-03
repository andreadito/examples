# Trading Commentary Editor

A markdown-based commentary component for trading applications. Write text with `:::` placeholders that resolve to live data from any context — market data, positions, risk metrics, or anything else.

Built with React 19, TypeScript, MUI v6, and [@uiw/react-md-editor](https://github.com/uiwjs/react-md-editor).

## Quick Start

```bash
npm install
npm run dev
```

## How It Works

1. **Config** (JSON-serializable, stored in DB) defines the editor title, toolbar, height, and default template
2. **Context data** (any nested object from React context, API, etc.) provides the live values
3. **`buildCategories`** and **`buildReplacer`** auto-generate the placeholder picker menu and resolver from the context object
4. Placeholders like `:::market.price.last` in the markdown are replaced with real values in the preview panel

## Basic Usage

```tsx
import { useState, useMemo } from 'react';
import { TradingCommentary } from './engine/TradingCommentary';
import { buildCategories } from './engine/buildCategories';
import { buildReplacer } from './engine/buildReplacer';
import type { CommentaryConfig } from './types';

// 1. Config — store this in your DB
const config: CommentaryConfig = {
  id: 'daily-commentary',
  title: 'Daily Commentary',
  editor: { height: 350, maxLength: 3000 },
  defaultContent: '## :::instrument.ticker\nTrading at :::market.price.last',
};

// 2. Context data — from React context, API, WebSocket, etc.
function MyCommentary() {
  const { data } = useMarketDataContext(); // your context
  const [content, setContent] = useState(config.defaultContent ?? '');

  const categories = useMemo(() => buildCategories(data), [data]);
  const replacer = useMemo(() => buildReplacer(data), [data]);

  return (
    <TradingCommentary
      config={config}
      value={content}
      onChange={setContent}
      replacer={replacer}
      categories={categories}
    />
  );
}
```

## Config Reference (`CommentaryConfig`)

The config is **100% JSON-serializable** — store it in a database, pass it over an API, or define it in a JSON file.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `string` | required | Unique identifier |
| `title` | `string` | required | Displayed in the editor header |
| `description` | `string` | — | Subtitle text below the title |
| `placeholderPrefix` | `string` | `":::"` | Prefix that identifies placeholders in the markdown |
| `editor.height` | `number` | `300` | Editor height in pixels |
| `editor.showPreview` | `boolean` | `true` | Whether the resolved preview panel is visible by default |
| `editor.toolbar` | `string[]` | compact set | Toolbar buttons to show (see below) |
| `editor.maxLength` | `number` | — | Character limit (shows counter in footer) |
| `defaultContent` | `string` | — | Initial markdown template with placeholders |

### Toolbar Options

Available toolbar items: `'bold'`, `'italic'`, `'heading'`, `'unordered-list'`, `'ordered-list'`, `'code'`, `'table'`, `'link'`, `'quote'`, `'strikethrough'`

```json
{
  "editor": {
    "toolbar": ["bold", "italic", "heading", "unordered-list", "table"]
  }
}
```

## Component Props

```tsx
interface TradingCommentaryProps {
  /** JSON config (from DB) */
  config: CommentaryConfig;
  /** Controlled markdown value */
  value: string;
  /** Called on content change */
  onChange: (value: string) => void;
  /** Resolves placeholder tokens to display values */
  replacer: PlaceholderReplacer;
  /** Optional — enables the placeholder picker menu */
  categories?: PlaceholderCategory[];
  /** Read-only mode (hides toolbar and insert button) */
  readOnly?: boolean;
}
```

### What goes in config vs. props?

| | Config (DB) | Props (runtime) |
|---|---|---|
| **Purpose** | Template definition | Live data + behavior |
| **Serializable** | Yes (JSON) | No (functions, objects) |
| **Examples** | title, toolbar, height, default content, prefix | replacer, categories, value, onChange |

## Placeholder System

### Prefix

Placeholders are identified by a prefix (default `:::`) followed by a dot-separated token path:

```
:::market.price.last    →  $142.50
:::position.pnl         →  +$21,500
:::risk.var             →  $8,200
```

The prefix is configurable per config via `placeholderPrefix`. You could use `{{`, `$`, or any string.

### Replacer Function

The `replacer` is a function you provide that maps a token string to its display value:

```tsx
type PlaceholderReplacer = (token: string) => string | undefined;
```

Return `undefined` for unresolvable tokens — they stay as-is in the preview and increment the "unresolved" counter.

### Custom Replacer

If your data isn't a simple nested object, write a custom replacer:

```tsx
const replacer = useCallback((token: string) => {
  // Route to different sources based on prefix
  if (token.startsWith('market.')) return marketApi.get(token);
  if (token.startsWith('position.')) return positionStore.get(token);
  if (token.startsWith('risk.')) return riskEngine.get(token);
  return undefined;
}, [marketApi, positionStore, riskEngine]);
```

### Without Categories (Manual Entry Only)

If you omit the `categories` prop, the picker menu button is hidden. Users can still type `:::token` directly in the editor and the replacer will resolve them.

```tsx
<TradingCommentary
  config={config}
  value={content}
  onChange={setContent}
  replacer={myReplacer}
  // no categories — no picker menu
/>
```

## Utilities

### `buildCategories(contextData)`

Auto-generates `PlaceholderCategory[]` from any nested object. Top-level keys become category groups, leaf values become placeholder entries with auto-generated labels and current values as examples.

```tsx
const data = {
  market: {
    price: { last: '$142.50', bid: '$142.48' },
    volume: '12M',
  },
  position: { quantity: 5000 },
};

buildCategories(data);
// → [
//   { id: 'market', label: 'Market', placeholders: [
//     { token: 'market.price.last', label: 'Price Last', example: '$142.50' },
//     { token: 'market.price.bid', label: 'Price Bid', example: '$142.48' },
//     { token: 'market.volume', label: 'Volume', example: '12M' },
//   ]},
//   { id: 'position', label: 'Position', placeholders: [
//     { token: 'position.quantity', label: 'Quantity', example: '5000' },
//   ]},
// ]
```

### `buildReplacer(contextData)`

Creates a `PlaceholderReplacer` that resolves dot-path tokens by walking the nested object:

```tsx
const replacer = buildReplacer(data);
replacer('market.price.last');  // → '$142.50'
replacer('position.quantity');  // → '5000'
replacer('unknown.path');       // → undefined
```

### Using Both Together

```tsx
const ctx = useMyContext();
const categories = useMemo(() => buildCategories(ctx), [ctx]);
const replacer = useMemo(() => buildReplacer(ctx), [ctx]);
```

When the context updates (e.g., real-time market data), both `categories` (with fresh example values) and `replacer` (with fresh resolved values) update automatically.

## Demos

The project includes 5 demo examples showing different use cases:

| Demo | Description | Context Data |
|------|-------------|--------------|
| **Trade Commentary** | Daily position commentary with market data | Prices, position, instrument, risk metrics |
| **Research Note** | Equity analyst report with fundamentals | Company info, valuation, earnings |
| **Risk Report** | End-of-day portfolio risk summary | Exposure, VaR, limits, sector breakdown |
| **Client Comms** | Trade confirmation for client distribution | Account info, trades, performance |
| **Incident Report** | Engineering post-incident summary (non-finance) | Service metrics, timeline, impact |

## Architecture

```
src/
  engine/
    TradingCommentary.tsx    # Main component (editor + preview + toolbar)
    PlaceholderMenu.tsx      # MUI Popover with searchable placeholder picker
    usePlaceholderResolver.ts # Hook: regex replaces :::tokens using replacer fn
    buildCategories.ts       # Utility: nested object → PlaceholderCategory[]
    buildReplacer.ts         # Utility: nested object → PlaceholderReplacer
  types/
    index.ts                 # CommentaryConfig, PlaceholderCategory, PlaceholderReplacer
  demo/
    TradingCommentaryDemo.tsx
    ResearchNoteDemo.tsx
    RiskReportDemo.tsx
    ClientCommsDemo.tsx
    IncidentReportDemo.tsx
```

## Dependencies

| Package | Size | Purpose |
|---------|------|---------|
| `@uiw/react-md-editor` | ~4.6 KB gzipped | Markdown editor with toolbar |
| `@mui/material` | — | UI components (Popover, Paper, Chip, etc.) |
| `react` / `react-dom` | — | React 19 |
