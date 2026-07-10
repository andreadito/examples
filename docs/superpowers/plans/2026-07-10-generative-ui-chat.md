# GenerativeUIChat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `generative-ui-chat/` — a Vite React app containing a reusable `<GenerativeUIChat>` component (MUI X chat + json-render canvas) where Claude generates catalog-constrained UI specs over live financial data, plus an Express key-masking proxy and a live-ticker demo.

**Architecture:** The browser owns the whole generation loop: it compiles a json-render catalog into (1) a `render_ui` Anthropic tool schema, (2) a system prompt, and (3) a React registry; calls Claude through a dumb Express proxy that only pins model/max_tokens and holds the API key; validates the returned spec with `catalog.validate()` with a 1-retry repair loop; and renders through `@json-render/react` with live data injected via a pluggable `StateStore` (jotai default, `@xstate/store` optional).

**Tech Stack:** Vite + React 18 + TypeScript, `@mui/material@^7.3`, `@mui/x-chat` (alpha), `@mui/x-charts`, `@mui/x-data-grid`, `@json-render/core|react|jotai|xstate@0.19.x`, `jotai`, `@xstate/store`, `ag-grid-community` + `ag-grid-react`, `echarts`, `zod`, Express + `@anthropic-ai/sdk` (server), Vitest + Testing Library.

## Global Constraints

- Project root: `~/repos/examples/generative-ui-chat/` (inside the existing git repo). All paths below are relative to that root unless they start with `docs/`.
- Spec: `docs/superpowers/specs/2026-07-10-generative-ui-chat-design.md` — read it before starting.
- **Git commits: plain messages, NO `Co-Authored-By` trailers** (explicit user preference).
- Server pins model `claude-opus-4-8` (env `ANTHROPIC_MODEL` overrides; the client can never choose the model) and caps `max_tokens` at 16000. Non-streaming only.
- json-render conventions: optional props use `.nullable()` (never `.optional()`); children via `slots: ["default"]`; state paths are JSON Pointer (`/data/positions`).
- The LLM must never receive raw library config surfaces (no raw ECharts `option`, no raw AG Grid config, no free-form `className`/CSS). Style freedom comes only from token enums + the validated `sx` subset.
- The component's public API surface is exactly what `src/generative-ui/index.ts` exports; the demo may import only from there.
- All commands run from the project root `generative-ui-chat/` unless stated otherwise.

---

### Task 1: Scaffold app, dependencies, tooling

**Files:**
- Create: `generative-ui-chat/` via Vite scaffold (package.json, tsconfig, index.html, src/…)
- Create: `vite.config.ts`, `vitest.config.ts`, `.env.example`, `server/tsconfig.json`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: npm scripts `dev` (server+web), `dev:server`, `dev:web`, `test`, `typecheck`; Vite proxy `/api` → `http://localhost:8787`; test setup with jsdom.

- [ ] **Step 1: Scaffold Vite app**

```bash
cd ~/repos/examples
npm create vite@latest generative-ui-chat -- --template react-ts
cd generative-ui-chat
rm -rf src/assets src/App.css src/index.css src/App.tsx
```

- [ ] **Step 2: Check json-render's zod peer requirement, then install dependencies**

```bash
npm info @json-render/core@0.19.0 peerDependencies
```
Install the zod major that satisfies it (assume `zod@^3` if the output allows both). Then:

```bash
npm install @mui/material@^7.3.0 @emotion/react @emotion/styled @mui/x-chat @mui/x-charts @mui/x-data-grid
npm install @json-render/core@0.19.0 @json-render/react@0.19.0 @json-render/jotai@0.19.0 @json-render/xstate@0.19.0
npm install jotai @xstate/store zod
npm install ag-grid-community ag-grid-react echarts
npm install express cors @anthropic-ai/sdk
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/express @types/cors tsx concurrently supertest @types/supertest
```
Expected: installs succeed with no peer-dependency errors (if `@mui/x-charts`/`x-data-grid` complain about material v7, install the major that lists `@mui/material@^7` as a peer).

- [ ] **Step 3: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
```

- [ ] **Step 4: Write `vitest.config.ts` and `src/test/setup.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Add scripts and env example**

In `package.json` `"scripts"`:

```json
{
  "dev": "concurrently -k \"npm:dev:server\" \"npm:dev:web\"",
  "dev:server": "tsx watch server/index.ts",
  "dev:web": "vite",
  "build": "tsc -b && vite build",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc -b --noEmit"
}
```

`.env.example`:

```
ANTHROPIC_API_KEY=sk-ant-...
# Optional override; server default is claude-opus-4-8
ANTHROPIC_MODEL=
```

Confirm the repo root `.gitignore` (or add `generative-ui-chat/.gitignore`) covers `node_modules`, `dist`, `.env`.

- [ ] **Step 6: Minimal placeholder entry so the app builds**

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div>generative-ui-chat scaffold</div>
  </React.StrictMode>,
);
```

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm run test`
Expected: typecheck passes; vitest reports "no test files found" (exit 0 with `--passWithNoTests`; add that flag to the `test` script if needed).
Run: `npm run dev:web` briefly — Vite serves the placeholder page.

- [ ] **Step 8: Commit**

```bash
git add generative-ui-chat && git commit -m "Scaffold generative-ui-chat app (Vite + deps + tooling)"
```

---

### Task 2: Express key-masking proxy

**Files:**
- Create: `server/index.ts`, `server/app.ts`
- Test: `server/app.test.ts`

**Interfaces:**
- Produces: `createApp(client: { messages: { create(body: object): Promise<unknown> } }): Express` from `server/app.ts`; `POST /api/claude` accepting `{ system, messages, tools, tool_choice, max_tokens }` and returning the raw Anthropic Message JSON. Model + max_tokens pinned server-side.

- [ ] **Step 1: Write the failing test**

```typescript
// server/app.test.ts
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

const fakeResponse = { id: 'msg_1', content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn' };

function makeClient() {
  return { messages: { create: vi.fn().mockResolvedValue(fakeResponse) } };
}

describe('POST /api/claude', () => {
  it('forwards system/messages/tools and returns the raw response', async () => {
    const client = makeClient();
    const res = await request(createApp(client))
      .post('/api/claude')
      .send({ system: 'sys', messages: [{ role: 'user', content: 'hello' }], tools: [{ name: 'render_ui' }] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeResponse);
    const body = client.messages.create.mock.calls[0][0];
    expect(body.system).toBe('sys');
    expect(body.tools).toEqual([{ name: 'render_ui' }]);
  });

  it('pins the model server-side and ignores client model', async () => {
    const client = makeClient();
    await request(createApp(client))
      .post('/api/claude')
      .send({ model: 'claude-haiku-4-5', messages: [{ role: 'user', content: 'x' }] });
    expect(client.messages.create.mock.calls[0][0].model).toBe('claude-opus-4-8');
  });

  it('caps max_tokens at 16000', async () => {
    const client = makeClient();
    await request(createApp(client))
      .post('/api/claude')
      .send({ max_tokens: 999999, messages: [{ role: 'user', content: 'x' }] });
    expect(client.messages.create.mock.calls[0][0].max_tokens).toBe(16000);
  });

  it('rejects requests without messages', async () => {
    const res = await request(createApp(makeClient())).post('/api/claude').send({});
    expect(res.status).toBe(400);
  });

  it('maps upstream API errors to their status', async () => {
    const client = makeClient();
    client.messages.create.mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }));
    const res = await request(createApp(client))
      .post('/api/claude')
      .send({ messages: [{ role: 'user', content: 'x' }] });
    expect(res.status).toBe(429);
    expect(res.body.error).toContain('rate limited');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/app.test.ts`
Expected: FAIL — `createApp` not found.

- [ ] **Step 3: Implement `server/app.ts`**

```typescript
import express from 'express';
import cors from 'cors';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const MAX_TOKENS_CAP = 16000;

export interface ClaudeClient {
  messages: { create(body: Record<string, unknown>): Promise<unknown> };
}

export function createApp(client: ClaudeClient) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/claude', async (req, res) => {
    const { system, messages, tools, tool_choice, max_tokens } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages (non-empty array) is required' });
      return;
    }
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: Math.min(Number(max_tokens) || MAX_TOKENS_CAP, MAX_TOKENS_CAP),
        thinking: { type: 'adaptive' },
        ...(system ? { system } : {}),
        messages,
        ...(tools ? { tools } : {}),
        ...(tool_choice ? { tool_choice } : {}),
      });
      res.json(response);
    } catch (err) {
      const status = typeof (err as { status?: number }).status === 'number' ? (err as { status: number }).status : 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Upstream error' });
    }
  });

  return app;
}
```

- [ ] **Step 4: Implement `server/index.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { createApp } from './app';

const port = Number(process.env.PORT || 8787);
const app = createApp(new Anthropic());
app.listen(port, () => {
  console.log(`claude proxy listening on http://localhost:${port}`);
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run server/app.test.ts`
Expected: 5 PASS.

- [ ] **Step 6: Commit**

```bash
git add generative-ui-chat/server generative-ui-chat/package.json generative-ui-chat/package-lock.json
git commit -m "Add Express key-masking proxy for the Anthropic API"
```

---

### Task 3: Data transforms (pure functions + json-render `functions` map)

**Files:**
- Create: `src/generative-ui/catalog/transforms.ts`
- Test: `src/generative-ui/catalog/transforms.test.ts`

**Interfaces:**
- Produces:
  - Typed pure helpers: `aggregateBy(rows, by, field, op)`, `sortRows(rows, field, dir)`, `filterRows(rows, field, op, value)`, `topN(rows, field, n, dir)`, `withPctChange(rows, field)`.
  - `transformFunctions: Record<string, (args: Record<string, unknown>) => unknown>` — json-render `$computed` implementations keyed `aggregateBy | sortBy | filterBy | topN | pctChange`.
  - `transformDeclarations: Record<string, { description: string }>` — catalog `functions` declarations (descriptions written for the LLM, naming every arg).

- [ ] **Step 1: Write the failing tests**

```typescript
// src/generative-ui/catalog/transforms.test.ts
import { describe, it, expect } from 'vitest';
import { aggregateBy, sortRows, filterRows, topN, withPctChange, transformFunctions, transformDeclarations } from './transforms';

const rows = [
  { symbol: 'AAPL', sector: 'Tech', pnl: 100, qty: 10 },
  { symbol: 'MSFT', sector: 'Tech', pnl: -50, qty: 5 },
  { symbol: 'XOM', sector: 'Energy', pnl: 30, qty: 8 },
];

describe('transforms', () => {
  it('aggregateBy sums per group', () => {
    expect(aggregateBy(rows, 'sector', 'pnl', 'sum')).toEqual([
      { key: 'Tech', value: 50 },
      { key: 'Energy', value: 30 },
    ]);
  });

  it('aggregateBy supports avg/min/max/count', () => {
    expect(aggregateBy(rows, 'sector', 'pnl', 'avg')).toEqual([
      { key: 'Tech', value: 25 },
      { key: 'Energy', value: 30 },
    ]);
    expect(aggregateBy(rows, 'sector', 'pnl', 'count')).toEqual([
      { key: 'Tech', value: 2 },
      { key: 'Energy', value: 1 },
    ]);
  });

  it('sortRows sorts descending without mutating input', () => {
    const sorted = sortRows(rows, 'pnl', 'desc');
    expect(sorted.map((r) => r.symbol)).toEqual(['AAPL', 'XOM', 'MSFT']);
    expect(rows[0].symbol).toBe('AAPL');
  });

  it('filterRows supports eq/gt/contains', () => {
    expect(filterRows(rows, 'sector', 'eq', 'Tech')).toHaveLength(2);
    expect(filterRows(rows, 'pnl', 'gt', 0)).toHaveLength(2);
    expect(filterRows(rows, 'symbol', 'contains', 'AA')).toHaveLength(1);
  });

  it('topN returns n largest by field', () => {
    expect(topN(rows, 'pnl', 2, 'desc').map((r) => r.symbol)).toEqual(['AAPL', 'XOM']);
  });

  it('withPctChange adds pct field relative to previous row', () => {
    const series = [{ close: 100 }, { close: 110 }, { close: 99 }];
    const out = withPctChange(series, 'close');
    expect(out[0].pct).toBe(0);
    expect(out[1].pct).toBeCloseTo(10);
    expect(out[2].pct).toBeCloseTo(-10);
  });

  it('transformFunctions are callable with args records and tolerate bad input', () => {
    expect(transformFunctions.aggregateBy({ data: rows, by: 'sector', field: 'pnl', op: 'sum' })).toEqual([
      { key: 'Tech', value: 50 },
      { key: 'Energy', value: 30 },
    ]);
    expect(transformFunctions.aggregateBy({ data: 'nonsense' })).toEqual([]);
    expect(Object.keys(transformDeclarations)).toEqual(Object.keys(transformFunctions));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/generative-ui/catalog/transforms.test.ts` — FAIL (module missing).

- [ ] **Step 3: Implement `src/generative-ui/catalog/transforms.ts`**

```typescript
type Row = Record<string, unknown>;
export type AggOp = 'sum' | 'avg' | 'min' | 'max' | 'count';
export type FilterOp = 'eq' | 'neq' | 'gt' | 'lt' | 'contains';

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const asRows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);

export function aggregateBy(rows: Row[], by: string, field: string, op: AggOp) {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const key = String(row[by]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(num(row[field]));
  }
  return Array.from(groups.entries()).map(([key, values]) => {
    let value: number;
    switch (op) {
      case 'sum': value = values.reduce((a, b) => a + b, 0); break;
      case 'avg': value = values.reduce((a, b) => a + b, 0) / values.length; break;
      case 'min': value = Math.min(...values); break;
      case 'max': value = Math.max(...values); break;
      case 'count': value = values.length; break;
    }
    return { key, value };
  });
}

export function sortRows(rows: Row[], field: string, dir: 'asc' | 'desc' = 'asc') {
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[field], bv = b[field];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
    return String(av).localeCompare(String(bv)) * sign;
  });
}

export function filterRows(rows: Row[], field: string, op: FilterOp, value: unknown) {
  return rows.filter((row) => {
    const v = row[field];
    switch (op) {
      case 'eq': return v === value || String(v) === String(value);
      case 'neq': return v !== value && String(v) !== String(value);
      case 'gt': return num(v) > num(value);
      case 'lt': return num(v) < num(value);
      case 'contains': return String(v).toLowerCase().includes(String(value).toLowerCase());
    }
  });
}

export function topN(rows: Row[], field: string, n: number, dir: 'asc' | 'desc' = 'desc') {
  return sortRows(rows, field, dir).slice(0, Math.max(0, n));
}

export function withPctChange(rows: Row[], field: string) {
  let prev: number | null = null;
  return rows.map((row) => {
    const v = num(row[field]);
    const pct = prev === null || prev === 0 ? 0 : ((v - prev) / prev) * 100;
    prev = v;
    return { ...row, pct };
  });
}

type Args = Record<string, unknown>;

export const transformFunctions: Record<string, (args: Args) => unknown> = {
  aggregateBy: (a) => aggregateBy(asRows(a.data), String(a.by ?? ''), String(a.field ?? ''), (a.op as AggOp) ?? 'sum'),
  sortBy: (a) => sortRows(asRows(a.data), String(a.field ?? ''), (a.dir as 'asc' | 'desc') ?? 'asc'),
  filterBy: (a) => filterRows(asRows(a.data), String(a.field ?? ''), (a.op as FilterOp) ?? 'eq', a.value),
  topN: (a) => topN(asRows(a.data), String(a.field ?? ''), num(a.n ?? 5), (a.dir as 'asc' | 'desc') ?? 'desc'),
  pctChange: (a) => withPctChange(asRows(a.data), String(a.field ?? '')),
};

export const transformDeclarations: Record<string, { description: string }> = {
  aggregateBy: { description: 'Group rows and aggregate. args: data (array expression), by (group field), field (numeric field), op (sum|avg|min|max|count). Returns [{key, value}].' },
  sortBy: { description: 'Sort rows. args: data (array expression), field, dir (asc|desc). Returns sorted array.' },
  filterBy: { description: 'Filter rows. args: data (array expression), field, op (eq|neq|gt|lt|contains), value. Returns filtered array.' },
  topN: { description: 'Largest/smallest N rows. args: data (array expression), field (numeric), n, dir (asc|desc). Returns array.' },
  pctChange: { description: 'Adds a pct field = percent change of `field` vs previous row. args: data (array expression), field. Returns array.' },
};
```

- [ ] **Step 4: Run tests — PASS.** `npx vitest run src/generative-ui/catalog/transforms.test.ts`

- [ ] **Step 5: Commit** — `git add -A generative-ui-chat/src && git commit -m "Add whitelisted data transforms for generated UIs"`

---

### Task 4: Style tokens + validated sx subset

**Files:**
- Create: `src/generative-ui/catalog/styleTokens.ts`
- Test: `src/generative-ui/catalog/styleTokens.test.ts`

**Interfaces:**
- Produces: `colorToken` (Zod enum: default|primary|secondary|success|error|warning|info), `sizeToken` (sm|md|lg), `sxSubsetSchema` (ZodObject, all fields `.nullable()`), `toSx(value)` → MUI `sx` object or `undefined`, `tokenToMuiColor(token)` → MUI color string or `undefined` for 'default'.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/generative-ui/catalog/styleTokens.test.ts
import { describe, it, expect } from 'vitest';
import { sxSubsetSchema, toSx, colorToken, tokenToMuiColor } from './styleTokens';

describe('style tokens', () => {
  it('accepts whitelisted sx fields', () => {
    const parsed = sxSubsetSchema.safeParse({ p: 2, gap: 1, width: '100%', textAlign: 'center' });
    expect(parsed.success).toBe(true);
  });

  it('rejects arbitrary CSS-ish fields', () => {
    expect(sxSubsetSchema.safeParse({ position: 'fixed' }).success).toBe(false);
    expect(sxSubsetSchema.safeParse({ background: 'url(x)' }).success).toBe(false);
  });

  it('toSx strips nulls and returns undefined for empty', () => {
    expect(toSx({ p: 2, gap: null } as never)).toEqual({ p: 2 });
    expect(toSx(null)).toBeUndefined();
    expect(toSx(undefined)).toBeUndefined();
  });

  it('colorToken maps to MUI colors', () => {
    expect(colorToken.safeParse('success').success).toBe(true);
    expect(colorToken.safeParse('rebeccapurple').success).toBe(false);
    expect(tokenToMuiColor('default')).toBeUndefined();
    expect(tokenToMuiColor('success')).toBe('success');
  });
});
```

- [ ] **Step 2: Run — FAIL** (module missing).

- [ ] **Step 3: Implement `src/generative-ui/catalog/styleTokens.ts`**

```typescript
import { z } from 'zod';

export const colorToken = z.enum(['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info']);
export type ColorToken = z.infer<typeof colorToken>;

export const sizeToken = z.enum(['sm', 'md', 'lg']);

export function tokenToMuiColor(token: ColorToken | null | undefined) {
  return !token || token === 'default' ? undefined : token;
}

// Whitelisted slice of MUI's sx: spacing in theme units, layout fractions,
// alignment, radius. strict() so unknown CSS is rejected, not stripped.
export const sxSubsetSchema = z
  .object({
    p: z.number().nullable(),
    px: z.number().nullable(),
    py: z.number().nullable(),
    mt: z.number().nullable(),
    mb: z.number().nullable(),
    gap: z.number().nullable(),
    width: z.string().nullable(),
    maxWidth: z.string().nullable(),
    height: z.string().nullable(),
    maxHeight: z.string().nullable(),
    flexGrow: z.number().nullable(),
    borderRadius: z.number().nullable(),
    textAlign: z.enum(['left', 'center', 'right']).nullable(),
  })
  .strict();
export type SxSubset = z.infer<typeof sxSubsetSchema>;

export function toSx(value: Partial<SxSubset> | null | undefined) {
  if (!value) return undefined;
  const entries = Object.entries(value).filter(([, v]) => v !== null && v !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
}
```

Note: every field is `.nullable()` but the object itself is used as `sxSubsetSchema.partial().strict()`-equivalent via nullable fields; if `catalog.validate` requires all keys present, wrap usages as `sxSubsetSchema.partial()` — decide by the Task 5 test result and keep the test green.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Commit** — `git commit -am "Add style token enums and validated sx subset"`

---

### Task 5: Catalog core — component/action/function definitions + compilation

**Files:**
- Create: `src/generative-ui/catalog/definitions.ts` (core MUI component defs, Zod)
- Create: `src/generative-ui/catalog/buildCatalog.ts` (merge extensions → `defineCatalog`)
- Create: `src/generative-ui/catalog/extension.ts` (public `CatalogExtension` type + helper)
- Test: `src/generative-ui/catalog/catalog.test.ts`

**Interfaces:**
- Consumes: `colorToken`, `sizeToken`, `sxSubsetSchema` (Task 4), `transformDeclarations` (Task 3).
- Produces:
  - `interface CatalogExtension { type: string; definition: { props: ZodObject; slots?: string[]; description?: string }; component: ComponentType<JsonRenderComponentProps> }` and `defineCatalogComponent(ext: CatalogExtension): CatalogExtension` (identity helper for DX/type inference) from `extension.ts`.
  - `buildCatalog(extensions?: CatalogExtension[])` from `buildCatalog.ts` → json-render `Catalog` (via `defineCatalog(schema, { components, actions, functions })`), including core defs + extension defs. Actions: `emit` (`{ name: string, payload: record nullable }`). Functions: `transformDeclarations`.
  - `coreDefinitions: Record<string, ComponentDefinition>` from `definitions.ts` with these component types: `Stack, Box, Card, Divider, Typography, Chip, Alert, LinearProgress, StatTile, DataList, Tabs, Select, Slider, ToggleButtonGroup, TextField, Switch, Button, LineChart, BarChart, PieChart, Sparkline, DataGrid`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/generative-ui/catalog/catalog.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildCatalog } from './buildCatalog';
import { defineCatalogComponent } from './extension';

const goodSpec = {
  root: 'stack-1',
  elements: {
    'stack-1': { type: 'Stack', props: { direction: 'column', gap: 2, sx: null }, children: ['stat-1'] },
    'stat-1': {
      type: 'StatTile',
      props: { label: 'Total P&L', value: { $state: '/data/totalPnl' }, format: 'currency', delta: null, color: 'success', sx: null },
      children: [],
    },
  },
};

describe('buildCatalog', () => {
  it('validates a known-good spec', () => {
    const catalog = buildCatalog();
    const result = catalog.validate(goodSpec);
    expect(result.success).toBe(true);
  });

  it('rejects a spec with an unknown component type', () => {
    const catalog = buildCatalog();
    const bad = { root: 'x', elements: { x: { type: 'Iframe', props: {}, children: [] } } };
    expect(catalog.validate(bad).success).toBe(false);
  });

  it('exports a JSON schema object usable as a tool input_schema', () => {
    const schema = buildCatalog().jsonSchema() as Record<string, unknown>;
    expect(schema).toBeTypeOf('object');
    expect(JSON.stringify(schema)).toContain('elements');
  });

  it('generates a prompt mentioning components and transforms', () => {
    const prompt = buildCatalog().prompt({ customRules: ['RULE_MARKER_XYZ'] });
    expect(prompt).toContain('StatTile');
    expect(prompt).toContain('aggregateBy');
    expect(prompt).toContain('RULE_MARKER_XYZ');
  });

  it('merges extensions into catalog validation and prompt', () => {
    const ext = defineCatalogComponent({
      type: 'MyWidget',
      definition: { props: z.object({ label: z.string() }), description: 'Test widget' },
      component: () => null,
    });
    const catalog = buildCatalog([ext]);
    const spec = { root: 'w', elements: { w: { type: 'MyWidget', props: { label: 'hi' }, children: [] } } };
    expect(catalog.validate(spec).success).toBe(true);
    expect(catalog.prompt()).toContain('MyWidget');
  });
});
```

- [ ] **Step 2: Run — FAIL.** `npx vitest run src/generative-ui/catalog/catalog.test.ts`

- [ ] **Step 3: Implement `src/generative-ui/catalog/extension.ts`**

```typescript
import type { ComponentType, ReactNode } from 'react';
import type { z } from 'zod';

/** Props every registered json-render component receives (ComponentContext). */
export interface JsonRenderComponentProps {
  props: Record<string, never> & Record<string, unknown>;
  children?: ReactNode;
  emit: (event: string) => void;
  bindings?: Record<string, string>;
  loading?: boolean;
}

export interface CatalogExtension {
  type: string;
  definition: {
    props: z.ZodObject<z.ZodRawShape>;
    slots?: string[];
    description?: string;
  };
  component: ComponentType<JsonRenderComponentProps>;
}

/** Identity helper — exists for inference/documentation at call sites. */
export function defineCatalogComponent(ext: CatalogExtension): CatalogExtension {
  return ext;
}
```

- [ ] **Step 4: Implement `src/generative-ui/catalog/definitions.ts`** — full core defs. Every optional prop `.nullable()`. Include `sx: sxSubsetSchema.partial().nullable()` on layout/display components. Descriptions are LLM-facing: say when to use the component.

```typescript
import { z } from 'zod';
import { colorToken, sizeToken, sxSubsetSchema } from './styleTokens';

const sx = sxSubsetSchema.partial().nullable();
const rows = z.array(z.record(z.any()));

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
} as const;
```

- [ ] **Step 5: Implement `src/generative-ui/catalog/buildCatalog.ts`**

```typescript
import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react/schema';
import { z } from 'zod';
import { coreDefinitions } from './definitions';
import { transformDeclarations } from './transforms';
import type { CatalogExtension } from './extension';

export function buildCatalog(extensions: CatalogExtension[] = []) {
  const components: Record<string, { props: z.ZodObject<z.ZodRawShape>; slots?: string[]; description?: string }> = {
    ...coreDefinitions,
  };
  for (const ext of extensions) {
    components[ext.type] = ext.definition;
  }
  return defineCatalog(schema, {
    components,
    actions: {
      emit: {
        params: z.object({ name: z.string(), payload: z.record(z.any()).nullable() }),
        description: 'Notify the host application of a user interaction. Use for submit/select/row-click style events.',
      },
    },
    functions: transformDeclarations,
  });
}
```

- [ ] **Step 6: Run tests.** `npx vitest run src/generative-ui/catalog/catalog.test.ts`
Expected: PASS. If `catalog.validate(goodSpec)` fails on expression props (e.g. `{ $state: ... }` for `value`), read the validation error: the library's spec schema is expected to accept expressions anywhere — if it does not for unions, adjust `StatTile.value` to `z.union([z.string(), z.number()])` → keep, and instead fix the test to use a literal value plus a second assertion using `$template`. Record whatever the library actually accepts in a code comment in `definitions.ts` — this behavior gates how the system prompt describes bindings.

- [ ] **Step 7: Commit** — `git commit -am "Add json-render catalog: core MUI definitions, actions, transforms, extensions"`

---

### Task 6: Registry — MUI implementations for core components

**Files:**
- Create: `src/generative-ui/catalog/impl/layout.tsx` (Stack, Box, Card, Divider)
- Create: `src/generative-ui/catalog/impl/display.tsx` (Typography, Chip, Alert, LinearProgress, StatTile, DataList)
- Create: `src/generative-ui/catalog/impl/inputs.tsx` (Tabs, Select, Slider, ToggleButtonGroup, TextField, Switch, Button)
- Create: `src/generative-ui/catalog/impl/charts.tsx` (LineChart, BarChart, PieChart, Sparkline — MUI X Charts)
- Create: `src/generative-ui/catalog/impl/grid.tsx` (DataGrid — MUI X DataGrid)
- Create: `src/generative-ui/catalog/impl/format.ts` (shared `formatValue(value, format)`)
- Create: `src/generative-ui/catalog/buildRuntime.tsx` (catalog + registry + handlers together)
- Test: `src/generative-ui/catalog/registry.test.tsx`

**Interfaces:**
- Consumes: `buildCatalog`, `CatalogExtension`, `transformFunctions`, `toSx`, `tokenToMuiColor`.
- Produces: `buildRuntime({ extensions?, emit }: { extensions?: CatalogExtension[]; emit: (name: string, payload?: Record<string, unknown>) => void })` → `{ catalog, registry, handlers, functions }` where `registry`/`handlers` come from `defineRegistry(catalog, { components, actions })` and `functions` is `transformFunctions`. Also `formatValue(value: unknown, format?: string | null): string`.

Implementation notes (apply in each impl file):
- Registry components receive `({ props, children, emit, bindings })`; bound inputs use `useBoundProp` from `@json-render/react`:
  ```tsx
  // inputs.tsx pattern (verbatim library contract)
  import { useBoundProp } from '@json-render/react';
  export function SelectImpl({ props, bindings }: JsonRenderComponentProps) {
    const [value, setValue] = useBoundProp<string>(props.value, bindings?.value);
    return (
      <FormControl size="small">
        {props.label ? <InputLabel>{String(props.label)}</InputLabel> : null}
        <MuiSelect value={value ?? ''} label={props.label ?? undefined} onChange={(e) => setValue(e.target.value)}>
          {(props.options as Array<{ value: string; label: string }>).map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </MuiSelect>
      </FormControl>
    );
  }
  ```
- `Button` calls `emit('press')`; the spec wires `on.press` to actions.
- `formatValue`: `currency` → `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`; `percent` → `x.toFixed(2) + '%'`; `number` → `Intl.NumberFormat`; `delta`/`raw` → string. StatTile delta renders `▲/▼` with success/error color.
- Charts: `<MuiLineChart dataset={props.data} xAxis={[{ dataKey: xKey, scaleType: 'band' }]} series={yKeys.map(k => ({ dataKey: k, area: !!props.area }))} height={props.height ?? 300} />`; Sparkline uses `@mui/x-charts` `SparkLineChart` with `data={rows.map(r => Number(r[valueKey]))}`.
- DataGrid maps `columns` to MUI X `GridColDef` with `valueFormatter` from `formatValue` and a `renderCell` for `delta` coloring; wraps in fixed-height Box (`height ?? 360`).
- `buildRuntime`:

```tsx
// buildRuntime.tsx (shape)
import { defineRegistry } from '@json-render/react';
import { buildCatalog } from './buildCatalog';
import { transformFunctions } from './transforms';
import { layoutComponents } from './impl/layout';
import { displayComponents } from './impl/display';
import { inputComponents } from './impl/inputs';
import { chartComponents } from './impl/charts';
import { gridComponents } from './impl/grid';
import type { CatalogExtension } from './extension';

export function buildRuntime({ extensions = [], emit }: { extensions?: CatalogExtension[]; emit: (name: string, payload?: Record<string, unknown>) => void }) {
  const catalog = buildCatalog(extensions);
  const extComponents = Object.fromEntries(extensions.map((e) => [e.type, e.component]));
  const { registry, handlers } = defineRegistry(catalog, {
    components: { ...layoutComponents, ...displayComponents, ...inputComponents, ...chartComponents, ...gridComponents, ...extComponents },
    actions: {
      emit: (params: Record<string, unknown>) => {
        emit(String(params.name ?? 'event'), (params.payload as Record<string, unknown>) ?? undefined);
      },
    },
  });
  return { catalog, registry, handlers, functions: transformFunctions };
}
```

- [ ] **Step 1: Write the failing smoke test**

```tsx
// src/generative-ui/catalog/registry.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Renderer, StateProvider, VisibilityProvider } from '@json-render/react';
import { buildRuntime } from './buildRuntime';

const spec = {
  root: 'stack-1',
  elements: {
    'stack-1': { type: 'Stack', props: { direction: 'column', gap: 2, wrap: null, sx: null }, children: ['stat-1', 'text-1'] },
    'stat-1': { type: 'StatTile', props: { label: 'Total P&L', value: 1234.5, format: 'currency', delta: 2.1, color: 'success', sx: null }, children: [] },
    'text-1': { type: 'Typography', props: { text: { $state: '/data/note' }, variant: 'body2', color: null, sx: null }, children: [] },
  },
};

describe('registry smoke test', () => {
  it('renders a validated spec with live state', () => {
    const { catalog, registry } = buildRuntime({ emit: vi.fn() });
    expect(catalog.validate(spec).success).toBe(true);
    render(
      <StateProvider initialState={{ data: { note: 'from state' } }}>
        <VisibilityProvider>
          <Renderer spec={spec as never} registry={registry} />
        </VisibilityProvider>
      </StateProvider>,
    );
    expect(screen.getByText('Total P&L')).toBeInTheDocument();
    expect(screen.getByText('$1,234.50')).toBeInTheDocument();
    expect(screen.getByText('from state')).toBeInTheDocument();
  });

  it('registry has an implementation for every catalog component', () => {
    const { registry } = buildRuntime({ emit: vi.fn() });
    for (const type of ['Stack', 'Box', 'Card', 'Divider', 'Typography', 'Chip', 'Alert', 'LinearProgress', 'StatTile', 'DataList', 'Tabs', 'Select', 'Slider', 'ToggleButtonGroup', 'TextField', 'Switch', 'Button', 'LineChart', 'BarChart', 'PieChart', 'Sparkline', 'DataGrid']) {
      expect(registry[type], `missing registry impl for ${type}`).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement the impl files + buildRuntime** per the notes above. Each impl file exports a `Record<string, ComponentType<JsonRenderComponentProps>>` (`layoutComponents`, `displayComponents`, …). Keep chart components free of jsdom-hostile code paths at import time (pure component functions are fine; they are not mounted by the smoke test).

- [ ] **Step 4: Run tests — PASS.** If MUI X Charts throws under jsdom when *not* rendered, that's an import-time error — fix by importing chart pieces inside the component functions is NOT needed; only mounting is avoided. If `$state` inside `Typography.text` fails catalog validation, apply the same resolution recorded in Task 5 Step 6.

- [ ] **Step 5: Commit** — `git commit -am "Add MUI registry implementations and buildRuntime"`

---

### Task 7: Finance built-ins — AG Grid + ECharts as extensions

**Files:**
- Create: `src/generative-ui/catalog/impl/finance/EChart.tsx` (base wrapper: init/setOption/resize/dispose)
- Create: `src/generative-ui/catalog/impl/finance/candlestick.tsx`, `heatmap.tsx`, `treemap.tsx`
- Create: `src/generative-ui/catalog/impl/finance/advancedGrid.tsx` (AG Grid Community)
- Create: `src/generative-ui/catalog/financeExtensions.ts` (the four `CatalogExtension`s, components lazy-loaded)
- Test: `src/generative-ui/catalog/financeExtensions.test.ts`

**Interfaces:**
- Consumes: `defineCatalogComponent`, `CatalogExtension`, `buildCatalog`.
- Produces: `financeExtensions: CatalogExtension[]` with types `AdvancedGrid`, `CandlestickChart`, `Heatmap`, `Treemap`. Definitions:
  - `AdvancedGrid`: `{ data: rows, columns: [{ field, headerName?, format?(currency|percent|number|delta|raw), pinned?('left'|'right'), width? }], height?, filterable? }`
  - `CandlestickChart`: `{ data: rows /* {time,open,high,low,close,volume} */, showVolume?, height? }`
  - `Heatmap`: `{ data: rows, xKey, yKey, valueKey, height? }`
  - `Treemap`: `{ data: rows /* {name,value} */, height? }`

Implementation notes:
- `EChart.tsx`: `useRef<HTMLDivElement>` + `useEffect(() => { const chart = echarts.init(el); chart.setOption(option); const ro = new ResizeObserver(() => chart.resize()); ro.observe(el); return () => { ro.disconnect(); chart.dispose(); }; }, [])` + a second effect calling `chart.setOption(option, { notMerge: true })` when option changes. Import `* as echarts from 'echarts'`.
- Wrapper components build the ECharts `option` internally from validated props — the option object is never in the catalog.
- Lazy loading: `component: lazy(() => import('./impl/finance/candlestick').then(m => ({ default: m.CandlestickImpl })))` wrapped so Suspense is provided by the canvas (Task 9 adds `<Suspense>` around `<Renderer>`).
- AG Grid Community: register modules once (`ModuleRegistry.registerModules([AllCommunityModule])` per ag-grid v33+ API — check the installed major's docs if this import fails and use its documented registration call), map `format` to `valueFormatter`/`cellClassRules` for delta coloring.
- jsdom cannot run canvas/ECharts — tests assert catalog-level behavior only, not mounting.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/generative-ui/catalog/financeExtensions.test.ts
import { describe, it, expect } from 'vitest';
import { buildCatalog } from './buildCatalog';
import { financeExtensions } from './financeExtensions';

describe('finance extensions', () => {
  it('exposes the four finance components', () => {
    expect(financeExtensions.map((e) => e.type).sort()).toEqual(['AdvancedGrid', 'CandlestickChart', 'Heatmap', 'Treemap']);
  });

  it('catalog with finance extensions validates a candlestick spec', () => {
    const catalog = buildCatalog(financeExtensions);
    const spec = {
      root: 'c1',
      elements: {
        c1: { type: 'CandlestickChart', props: { data: { $state: '/data/ohlc/AAPL' }, showVolume: true, height: 320 }, children: [] },
      },
    };
    expect(catalog.validate(spec).success).toBe(true);
  });

  it('prompt documents finance components', () => {
    const prompt = buildCatalog(financeExtensions).prompt();
    expect(prompt).toContain('CandlestickChart');
    expect(prompt).toContain('AdvancedGrid');
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** the five impl files and `financeExtensions.ts`. Each definition's `description` states when to use it (e.g. Candlestick: 'OHLC price history for one symbol; data rows need time/open/high/low/close/volume — bind /data/ohlc/<SYMBOL>').

- [ ] **Step 4: Run — PASS.** Also rerun the whole suite: `npm test`.

- [ ] **Step 5: Commit** — `git commit -am "Add finance built-ins (AG Grid, ECharts candle/heatmap/treemap) via extension API"`

---

### Task 8: Pluggable state stores (jotai default, xstate optional)

**Files:**
- Create: `src/generative-ui/state/jotaiStore.ts`, `src/generative-ui/state/xstateStore.ts`, `src/generative-ui/state/types.ts`
- Test: `src/generative-ui/state/stores.test.ts`

**Interfaces:**
- Produces: `createJotaiStore(initialState?: Record<string, unknown>): StateStore`, `createXStateStore(initialState?: Record<string, unknown>): StateStore`; `types.ts` re-exports `type { StateStore } from '@json-render/core'`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/generative-ui/state/stores.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createJotaiStore } from './jotaiStore';
import { createXStateStore } from './xstateStore';

describe.each([
  ['jotai', createJotaiStore],
  ['xstate', createXStateStore],
])('%s state store', (_name, createStore) => {
  it('get/set round-trips JSON Pointer paths and notifies subscribers', () => {
    const store = createStore({ data: { positions: [] } });
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.set('/data/positions', [{ symbol: 'AAPL' }]);
    expect(store.get('/data/positions')).toEqual([{ symbol: 'AAPL' }]);
    expect(listener).toHaveBeenCalled();
    unsub();
  });

  it('getSnapshot returns the full model', () => {
    const store = createStore({ a: 1 });
    store.set('/b', 2);
    expect(store.getSnapshot()).toMatchObject({ a: 1, b: 2 });
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement**

```typescript
// src/generative-ui/state/jotaiStore.ts
import { atom, createStore } from 'jotai';
import { jotaiStateStore } from '@json-render/jotai';
import type { StateStore } from '@json-render/core';

export function createJotaiStore(initialState: Record<string, unknown> = {}): StateStore {
  const uiAtom = atom<Record<string, unknown>>(initialState);
  return jotaiStateStore({ atom: uiAtom, store: createStore() });
}
```

```typescript
// src/generative-ui/state/xstateStore.ts
import { createAtom } from '@xstate/store';
import { xstateStoreStateStore } from '@json-render/xstate';
import type { StateStore } from '@json-render/core';

export function createXStateStore(initialState: Record<string, unknown> = {}): StateStore {
  return xstateStoreStateStore({ atom: createAtom(initialState) });
}
```

```typescript
// src/generative-ui/state/types.ts
export type { StateStore } from '@json-render/core';
```

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Commit** — `git commit -am "Add pluggable jotai/xstate state stores"`

---

### Task 9: Browser-side generation loop (prompt build, call, validate, repair)

**Files:**
- Create: `src/generative-ui/llm/describeData.ts`, `src/generative-ui/llm/generate.ts`
- Test: `src/generative-ui/llm/describeData.test.ts`, `src/generative-ui/llm/generate.test.ts`

**Interfaces:**
- Consumes: a `Catalog` from `buildCatalog`/`buildRuntime`.
- Produces:
  - `describeData(data: unknown, dataDescription?: string): string` — compact text: per top-level key → kind (array/record), row count, field names + inferred types, one sample row (numbers rounded, arrays truncated to 1 sample).
  - `generate(args: GenerateArgs): Promise<GenerateResult>` where:
    ```typescript
    export interface ChatTurn { role: 'user' | 'assistant'; text: string }
    export interface GenerateArgs {
      endpoint: string;                       // '/api/claude'
      catalog: { validate(s: unknown): { success: boolean; error?: unknown }; jsonSchema(): object; prompt(o?: object): string };
      history: ChatTurn[];
      prompt: string;
      currentSpec: object | null;
      dataInfo: string;                       // describeData output
      signal?: AbortSignal;
    }
    export interface GenerateResult { text: string; spec: object | null }
    ```
- Behavior contract (encode in tests):
  1. System prompt = `catalog.prompt({ customRules })` with rules: never emit JSON/JSONL in text; to create or update the UI call the `render_ui` tool with the **complete** spec; bind live data via `$state` paths under `/data` (shape given by `dataInfo`); if a request can't be built from the catalog, say so in chat and offer the nearest thing you CAN build.
  2. Messages = history turns (text only) + final user message containing the user prompt, plus (when `currentSpec` non-null) `Current spec:\n<JSON>\nEdit it and call render_ui with the complete updated spec.`
  3. Tools = `[{ name: 'render_ui', description: 'Render or replace the UI on the canvas. Input is the complete UI spec.', input_schema: catalog.jsonSchema() }]`.
  4. Parse: `stop_reason === 'refusal'` → return `{ text: 'The request was declined by the model's safety system. Try rephrasing.', spec: null }`. Text = concatenated `text` blocks. If a `render_ui` tool_use exists → `catalog.validate(input)`; on success return spec; on failure, do exactly ONE repair round-trip: append assistant `content` verbatim + user message with a `tool_result` block (`tool_use_id`, `is_error: true`, content = stringified validation error + 'Call render_ui again with a corrected complete spec.'), re-call, re-validate. Second failure → throw `Error('Generated UI failed validation twice: …')`.
  5. Non-OK HTTP → throw with the server's `error` message.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/generative-ui/llm/generate.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generate } from './generate';
import { buildCatalog } from '../catalog/buildCatalog';

const catalog = buildCatalog();
const goodSpec = {
  root: 's',
  elements: { s: { type: 'Typography', props: { text: 'hello', variant: null, color: null, sx: null }, children: [] } },
};
const badSpec = { root: 'x', elements: { x: { type: 'NotAComponent', props: {}, children: [] } } };

function claudeResponse(content: unknown[], stop_reason = 'end_turn') {
  return { ok: true, json: async () => ({ content, stop_reason }) };
}

const baseArgs = { endpoint: '/api/claude', catalog, history: [], prompt: 'build a thing', currentSpec: null, dataInfo: 'positions: array(3)' };

describe('generate', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns text + validated spec from a tool call', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      claudeResponse([
        { type: 'text', text: 'Here is your dashboard' },
        { type: 'tool_use', id: 'tu_1', name: 'render_ui', input: goodSpec },
      ]),
    );
    const result = await generate(baseArgs);
    expect(result.text).toContain('dashboard');
    expect(result.spec).toEqual(goodSpec);
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.tools[0].name).toBe('render_ui');
    expect(body.system).toContain('Typography');
  });

  it('text-only response returns spec null', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(claudeResponse([{ type: 'text', text: 'I cannot build that, but I could…' }]));
    const result = await generate(baseArgs);
    expect(result.spec).toBeNull();
  });

  it('repairs an invalid spec once via tool_result and succeeds', async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(claudeResponse([{ type: 'tool_use', id: 'tu_1', name: 'render_ui', input: badSpec }]))
      .mockResolvedValueOnce(claudeResponse([{ type: 'tool_use', id: 'tu_2', name: 'render_ui', input: goodSpec }]));
    const result = await generate(baseArgs);
    expect(result.spec).toEqual(goodSpec);
    expect(fetch).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body);
    const lastMsg = secondBody.messages.at(-1);
    expect(lastMsg.role).toBe('user');
    expect(lastMsg.content[0].type).toBe('tool_result');
    expect(lastMsg.content[0].tool_use_id).toBe('tu_1');
    expect(lastMsg.content[0].is_error).toBe(true);
  });

  it('throws after two invalid specs', async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(claudeResponse([{ type: 'tool_use', id: 'tu_1', name: 'render_ui', input: badSpec }]))
      .mockResolvedValueOnce(claudeResponse([{ type: 'tool_use', id: 'tu_2', name: 'render_ui', input: badSpec }]));
    await expect(generate(baseArgs)).rejects.toThrow(/validation/i);
  });

  it('includes currentSpec in the user prompt for edits', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(claudeResponse([{ type: 'text', text: 'ok' }]));
    await generate({ ...baseArgs, currentSpec: goodSpec });
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(JSON.stringify(body.messages.at(-1))).toContain('Current spec');
  });

  it('maps refusal stop_reason to a friendly message', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(claudeResponse([], 'refusal'));
    const result = await generate(baseArgs);
    expect(result.spec).toBeNull();
    expect(result.text.toLowerCase()).toContain('declined');
  });

  it('throws on non-OK HTTP with server error message', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'rate limited' }) });
    await expect(generate(baseArgs)).rejects.toThrow(/rate limited/);
  });
});
```

```typescript
// src/generative-ui/llm/describeData.test.ts
import { describe, it, expect } from 'vitest';
import { describeData } from './describeData';

describe('describeData', () => {
  it('summarizes arrays with fields, types, count, and one sample', () => {
    const out = describeData({ positions: [{ symbol: 'AAPL', pnl: 12.3456 }, { symbol: 'MSFT', pnl: -1 }] });
    expect(out).toContain('positions');
    expect(out).toContain('2 rows');
    expect(out).toContain('symbol: string');
    expect(out).toContain('pnl: number');
    expect(out).not.toContain('MSFT'); // only one sample row
  });

  it('summarizes nested records of arrays', () => {
    const out = describeData({ ohlc: { AAPL: [{ time: 't', close: 1 }], MSFT: [{ time: 't', close: 2 }] } });
    expect(out).toContain('/data/ohlc/AAPL');
  });

  it('prepends the human description when provided', () => {
    expect(describeData({ a: [] }, 'Open trading positions')).toContain('Open trading positions');
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement `describeData.ts` and `generate.ts`** per the behavior contract. `generate` internals:

```typescript
async function callProxy(endpoint: string, body: object, signal?: AbortSignal) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<{ content: Array<Record<string, unknown>>; stop_reason: string }>;
}
```

Repair round-trip appends `{ role: 'assistant', content: msg.content }` then `{ role: 'user', content: [{ type: 'tool_result', tool_use_id, is_error: true, content: errorText }] }` and re-sends the same `system`/`tools`.

- [ ] **Step 4: Run — PASS.** `npx vitest run src/generative-ui/llm`

- [ ] **Step 5: Commit** — `git commit -am "Add browser-side generation loop with validation and repair"`

---

### Task 10: GenerativeUIChat component (canvas + chat + callbacks)

**Files:**
- Create: `src/generative-ui/GenerativeUIChat.tsx`
- Create: `src/generative-ui/CanvasErrorBoundary.tsx`
- Create: `src/generative-ui/index.ts` (public API)
- Test: `src/generative-ui/GenerativeUIChat.test.tsx`

**Interfaces:**
- Consumes: `buildRuntime` (Task 6), `financeExtensions` (Task 7), `createJotaiStore` (Task 8), `generate`, `describeData` (Task 9), `ChatBox` + `ChatAdapter` from `@mui/x-chat` / `@mui/x-chat/headless`, `Renderer`/`JSONUIProvider`/`StateProvider` from `@json-render/react`.
- Produces (from `index.ts`):
  ```typescript
  export { GenerativeUIChat } from './GenerativeUIChat';
  export type { GenerativeUIChatProps } from './GenerativeUIChat';
  export { defineCatalogComponent } from './catalog/extension';
  export type { CatalogExtension, JsonRenderComponentProps } from './catalog/extension';
  export { financeExtensions } from './catalog/financeExtensions';
  export { createJotaiStore } from './state/jotaiStore';
  export { createXStateStore } from './state/xstateStore';
  export type { StateStore } from './state/types';
  ```
  ```typescript
  export interface GenerativeUIChatProps {
    data: Record<string, unknown>;                 // live data; written to state under /data on every change
    dataDescription?: string;
    stateStore?: StateStore;                       // default: createJotaiStore
    extensions?: CatalogExtension[];               // extra catalog components (financeExtensions are ALWAYS included)
    endpoint?: string;                             // default '/api/claude'
    onSpecChange?: (spec: object | null) => void;
    onStateChange?: (state: Record<string, unknown>) => void;
    onEvent?: (name: string, payload?: Record<string, unknown>) => void;
    onError?: (error: Error) => void;
  }
  ```

Component structure:

```tsx
// GenerativeUIChat.tsx (structure — implement fully)
export function GenerativeUIChat(props: GenerativeUIChatProps) {
  const { data, dataDescription, stateStore, extensions, endpoint = '/api/claude', onSpecChange, onStateChange, onEvent, onError } = props;

  // 1. Store: caller's or default jotai; stable for component lifetime.
  const storeRef = useRef<StateStore>();
  if (!storeRef.current) storeRef.current = stateStore ?? createJotaiStore({ data });
  const store = storeRef.current;

  // 2. Live data injection: prop change -> store write (new reference required by StateStore contract).
  useEffect(() => { store.set('/data', data); }, [store, data]);

  // 3. onStateChange subscription.
  useEffect(() => {
    if (!onStateChange) return;
    return store.subscribe(() => onStateChange(store.getSnapshot()));
  }, [store, onStateChange]);

  // 4. Runtime: catalog+registry+handlers, memoized on extensions. onEvent via ref so identity is stable.
  const onEventRef = useRef(onEvent); onEventRef.current = onEvent;
  const allExtensions = useMemo(() => [...financeExtensions, ...(extensions ?? [])], [extensions]);
  const runtime = useMemo(
    () => buildRuntime({ extensions: allExtensions, emit: (n, p) => onEventRef.current?.(n, p) }),
    [allExtensions],
  );

  // 5. Spec + history (text transcript only).
  const [spec, setSpec] = useState<object | null>(null);
  const specRef = useRef(spec); specRef.current = spec;
  const historyRef = useRef<ChatTurn[]>([]);

  // 6. Chat adapter — STABLE identity (useMemo with [] and refs inside).
  const adapter = useMemo<ChatAdapter>(() => ({
    sendMessage: async ({ message, signal }) => {
      const prompt = message.parts.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('\n');
      let result: GenerateResult;
      try {
        result = await generate({
          endpoint,
          catalog: runtimeRef.current.catalog,
          history: historyRef.current,
          prompt,
          currentSpec: specRef.current,
          dataInfo: describeData(storeRef.current!.get('/data'), dataDescription),
          signal,
        });
      } catch (err) {
        onErrorRef.current?.(err as Error);
        throw err;                      // ChatBox renders its built-in error card with Retry
      }
      if (result.spec) { setSpec(result.spec); onSpecChangeRef.current?.(result.spec); }
      historyRef.current = [...historyRef.current, { role: 'user', text: prompt }, { role: 'assistant', text: result.text }];
      const messageId = crypto.randomUUID();
      return new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'start', messageId });
          controller.enqueue({ type: 'text-start', id: 'text-1' });
          controller.enqueue({ type: 'text-delta', id: 'text-1', delta: result.text || 'Done — rendered on the canvas.' });
          controller.enqueue({ type: 'text-end', id: 'text-1' });
          controller.enqueue({ type: 'finish', messageId });
          controller.close();
        },
      });
    },
  }), []); // refs keep it fresh: runtimeRef, specRef, historyRef, storeRef, onSpecChangeRef, onErrorRef; endpoint+dataDescription via refs too

  // 7. Layout: canvas (flex 1) + chat panel (fixed 380px), both height 100%.
  return (
    <Stack direction="row" sx={{ height: '100%', minHeight: 480 }}>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <CanvasErrorBoundary onError={onError} resetKey={spec}>
          <StateProvider store={store}>
            <JSONUIProvider registry={runtime.registry} functions={runtime.functions} handlers={runtime.handlers /* wire per defineRegistry docs pattern */}>
              <Suspense fallback={<CircularProgress />}>
                {spec ? <Renderer spec={spec as never} registry={runtime.registry} /> : <EmptyCanvasHint />}
              </Suspense>
            </JSONUIProvider>
          </StateProvider>
        </CanvasErrorBoundary>
      </Box>
      <Box sx={{ width: 380, borderLeft: '1px solid', borderColor: 'divider' }}>
        <ChatBox adapter={adapter} initialConversations={[{ id: 'main', title: 'UI Builder' }]} initialActiveConversationId="main"
          slotProps={{ composerInput: { placeholder: 'Build me something with this data…' } }}
          onError={(e) => onError?.(new Error(e.message))} sx={{ height: '100%' }} />
      </Box>
    </Stack>
  );
}
```

Implementation cautions:
- `handlers` from `defineRegistry` is a **factory** — follow the documented pattern: `const actionHandlers = useMemo(() => runtime.handlers(() => (updates) => store.update(updates), () => store.getSnapshot()), [runtime, store])` and check the actual factory signature in `@json-render/react` types; pass the result to `JSONUIProvider`/`ActionProvider`. If `JSONUIProvider` doesn't accept `store`, nest `StateProvider store={...}` inside/outside accordingly (StateProvider outermost is fine).
- `CanvasErrorBoundary`: class component; `componentDidCatch(err)` → `props.onError?.(err)`; render fallback `<Alert severity="error">This generated UI crashed — ask for a fix or a new UI.</Alert>`; reset when `resetKey` changes (`getDerivedStateFromProps` comparing key).
- `EmptyCanvasHint`: centered Typography explaining "Ask the chat to build something from your live data".

- [ ] **Step 1: Write the failing component test** (mock `./llm/generate` and `@mui/x-chat`'s heavy internals are NOT mocked — drive via the adapter indirectly by rendering and using the composer; simpler: extract adapter creation into a tested unit)

```tsx
// src/generative-ui/GenerativeUIChat.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenerativeUIChat } from './GenerativeUIChat';
import * as llm from './llm/generate';

const goodSpec = {
  root: 's',
  elements: { s: { type: 'StatTile', props: { label: 'Total P&L', value: 42, format: 'number', delta: null, color: null, sx: null }, children: [] } },
};

describe('GenerativeUIChat', () => {
  it('renders empty canvas hint and chat composer initially', () => {
    render(<GenerativeUIChat data={{ positions: [] }} />);
    expect(screen.getByText(/build something/i)).toBeInTheDocument();
  });

  it('renders generated spec on the canvas and fires onSpecChange', async () => {
    vi.spyOn(llm, 'generate').mockResolvedValue({ text: 'done', spec: goodSpec });
    const onSpecChange = vi.fn();
    render(<GenerativeUIChat data={{ positions: [] }} onSpecChange={onSpecChange} />);
    const input = screen.getByPlaceholderText(/build me something/i);
    await userEvent.type(input, 'make a stat{enter}');
    await waitFor(() => expect(screen.getByText('Total P&L')).toBeInTheDocument());
    expect(onSpecChange).toHaveBeenCalledWith(goodSpec);
  });

  it('fires onError when generation fails', async () => {
    vi.spyOn(llm, 'generate').mockRejectedValue(new Error('boom'));
    const onError = vi.fn();
    render(<GenerativeUIChat data={{}} onError={onError} />);
    await userEvent.type(screen.getByPlaceholderText(/build me something/i), 'x{enter}');
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });
});
```

Install `@testing-library/user-event` if not present (`npm i -D @testing-library/user-event`). If ChatBox's composer isn't reachable this way under jsdom, fall back to testing an exported `createChatAdapter(deps)` unit directly (extract it to `src/generative-ui/chatAdapter.ts`) and keep one shallow render test for the canvas — do NOT ship the component untested.

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** `CanvasErrorBoundary.tsx`, `GenerativeUIChat.tsx`, `index.ts` per the structure above.

- [ ] **Step 4: Run — PASS**, then full suite `npm test` and `npm run typecheck`.

- [ ] **Step 5: Commit** — `git commit -am "Add GenerativeUIChat component: canvas + MUI X chat + lifecycle callbacks"`

---

### Task 11: Demo app — live ticker + dashboard + callback log

**Files:**
- Create: `src/demo/ticker.ts`, `src/demo/useTicker.ts`, `src/demo/App.tsx`, `src/demo/CallbackLog.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: ONLY the public API from `src/generative-ui/index.ts`.
- Produces:
  - `createInitialPositions(): Position[]` (12 positions across ≥4 sectors), `tick(positions, ohlc): { positions, ohlc }` (random-walk lastPrice ±0.5%, recompute pnl/pnlPct, roll per-symbol OHLC bars — 1 bar per 5 ticks, keep last 60), `createInitialOhlc(positions): Record<string, OhlcBar[]>` (seed 60 bars of history per symbol).
  - `useTicker(intervalMs = 1000)` hook → `{ positions, ohlc, asOf }` updating on an interval.
  - Types: `Position { symbol; sector; qty; avgPrice; lastPrice; pnl; pnlPct; updatedAt }`, `OhlcBar { time; open; high; low; close; volume }`.

- [ ] **Step 1: Write failing tests for the ticker (pure parts)**

```typescript
// src/demo/ticker.test.ts
import { describe, it, expect } from 'vitest';
import { createInitialPositions, createInitialOhlc, tick } from './ticker';

describe('ticker', () => {
  it('creates 12 positions with sane fields', () => {
    const positions = createInitialPositions();
    expect(positions).toHaveLength(12);
    for (const p of positions) {
      expect(p.lastPrice).toBeGreaterThan(0);
      expect(p.pnl).toBeCloseTo((p.lastPrice - p.avgPrice) * p.qty, 5);
    }
    expect(new Set(positions.map((p) => p.sector)).size).toBeGreaterThanOrEqual(4);
  });

  it('tick moves prices and keeps pnl consistent', () => {
    const positions = createInitialPositions();
    const ohlc = createInitialOhlc(positions);
    const next = tick(positions, ohlc);
    expect(next.positions).toHaveLength(12);
    for (const p of next.positions) {
      expect(p.pnl).toBeCloseTo((p.lastPrice - p.avgPrice) * p.qty, 5);
    }
    expect(next.ohlc[positions[0].symbol].length).toBeLessThanOrEqual(61);
  });

  it('seeds 60 bars of OHLC history per symbol with high >= low', () => {
    const ohlc = createInitialOhlc(createInitialPositions());
    const bars = ohlc['AAPL'] ?? Object.values(ohlc)[0];
    expect(bars).toHaveLength(60);
    for (const b of bars) expect(b.high).toBeGreaterThanOrEqual(b.low);
  });
});
```

- [ ] **Step 2: Run — FAIL. Implement `ticker.ts`** (symbols: AAPL, MSFT, NVDA, GOOG, AMZN, META, JPM, GS, XOM, CVX, JNJ, PFE; sectors Tech/Financials/Energy/Healthcare). Run — PASS.

- [ ] **Step 3: Implement `useTicker.ts`, `CallbackLog.tsx`, `App.tsx`, `main.tsx`**

`App.tsx` layout: MUI `ThemeProvider` + `CssBaseline`; AppBar title "Trading Desk — Generative UI demo"; left column small (live positions table via plain MUI Table to prove the source data), main area `<GenerativeUIChat>` at `height: calc(100vh - 64px)`, bottom drawer/panel `<CallbackLog>` showing last 20 callback invocations with timestamps:

```tsx
const { positions, ohlc, asOf } = useTicker(1000);
const data = useMemo(() => ({ positions, ohlc, asOf, totalPnl: positions.reduce((a, p) => a + p.pnl, 0) }), [positions, ohlc, asOf]);
<GenerativeUIChat
  data={data}
  dataDescription="Live trading positions (refreshed every second) and per-symbol OHLC history"
  onSpecChange={(s) => log('onSpecChange', { elements: s ? Object.keys((s as { elements: object }).elements).length : 0 })}
  onStateChange={() => log('onStateChange')}
  onEvent={(name, payload) => log(`onEvent:${name}`, payload)}
  onError={(e) => log('onError', { message: e.message })}
/>
```
`log` throttles `onStateChange` entries (1/second max) so the ticker doesn't flood the log.

`main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './demo/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: Verify build + tests**

Run: `npm run typecheck && npm test`
Expected: all green.

- [ ] **Step 5: Commit** — `git commit -am "Add demo app: live ticker, dashboard shell, callback log"`

---

### Task 12: End-to-end verification + README

**Files:**
- Create: `README.md`
- Possibly modify: anything the live run reveals (prompt rules, formats, layout).

- [ ] **Step 1: Configure and launch**

```bash
cp .env.example .env   # then put the real ANTHROPIC_API_KEY in .env
npm run dev
```
Expected: proxy on :8787, Vite on :5173, dashboard renders with ticking positions table.

- [ ] **Step 2: Live scenario pass (browser)** — run each and confirm:
  1. "Build me something cool with this data" → chat replies, canvas renders a dashboard, tiles/charts tick with live data.
  2. "Show P&L by sector as a bar chart" → BarChart bound through `$computed aggregateBy`.
  3. "Add a candlestick chart for AAPL with volume" → ECharts candle from `/data/ohlc/AAPL`.
  4. "Make the chart bigger and add a symbol filter" → edit of existing spec (not a rebuild); Select filter drives the view.
  5. "Show me a 3D globe of my positions" → graceful chat refusal offering an alternative; canvas untouched.
  6. Callback log shows `onSpecChange` per generation, `onEvent` on Button/Select interactions, throttled `onStateChange`.
- [ ] **Step 3: Fix whatever the live pass reveals** (typical: prompt rules for `$state` path shapes, chart sizing, tool_choice nudging — if the model answers in text without calling `render_ui` for clear build requests, add customRule: 'When the user asks to build, show, chart, or visualize something, you MUST call render_ui.'). Re-run the scenario pass after each fix. Commit fixes individually with descriptive messages.
- [ ] **Step 4: Write `README.md`** — what it is, architecture diagram (catalog → tool schema/prompt/registry), setup (`.env`, `npm run dev`), public component API with the props table, how to add a catalog extension (`defineCatalogComponent` example), how to swap the state store (jotai/xstate), test commands.
- [ ] **Step 5: Final full check**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit** — `git commit -am "Add README and live-verification fixes"`

---

## Self-Review Notes (already applied)

- **Spec coverage:** proxy (T2), catalog full kit + style tokens (T4–6), finance built-ins via extension API (T7), pluggable jotai/xstate (T8), browser loop + repair + refusal handling (T9), canvas+chat component with all four callbacks + ErrorBoundary (T10), live ticker + OHLC demo + callback log (T11), README + live verification (T12). Graceful-refusal handling lives in the system prompt rules (T9) and scenario 5 (T12).
- **Known uncertainty, handled in-plan:** whether `catalog.validate` accepts expression objects in typed props (T5 step 6 + T6 step 4 record the resolution); `defineRegistry` handlers-factory exact signature (T10 caution); jsdom reachability of the ChatBox composer (T10 fallback: extract + test `chatAdapter`); AG Grid module-registration API by installed major (T7 note).
- **Type consistency check:** `buildRuntime` return `{ catalog, registry, handlers, functions }` used identically in T6/T10; `CatalogExtension`/`defineCatalogComponent` names match T5/T7/T10 exports; `ChatTurn`/`GenerateResult` match T9/T10; store contract is json-render's `StateStore` everywhere.
