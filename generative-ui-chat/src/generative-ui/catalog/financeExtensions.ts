import { createElement, lazy } from 'react';
import type { FunctionComponent } from 'react';
import { z } from 'zod';
import { defineCatalogComponent } from './extension';
import type { CatalogExtension, JsonRenderComponentProps } from './extension';

const rows = z.array(z.record(z.string(), z.any()));

// `React.lazy` returns a `LazyExoticComponent`, which is structurally close to
// but not assignable to `FunctionComponent<JsonRenderComponentProps>` (the type
// `CatalogExtension.component` requires). Wrap each lazy component in a thin
// functional component so the extension objects below satisfy that type; the
// Suspense boundary around the eventual render tree is provided by Task 10's
// canvas, not by these extensions.
//
// This file is kept as `.ts` (not `.tsx`) per the task brief's file list, so
// the wrappers use `React.createElement` rather than JSX syntax.
const LazyAdvancedGrid = lazy(() => import('./impl/finance/advancedGrid').then((m) => ({ default: m.AdvancedGridImpl })));
const AdvancedGridComponent: FunctionComponent<JsonRenderComponentProps> = (p) => createElement(LazyAdvancedGrid, p);

const LazyCandlestick = lazy(() => import('./impl/finance/candlestick').then((m) => ({ default: m.CandlestickImpl })));
const CandlestickComponent: FunctionComponent<JsonRenderComponentProps> = (p) => createElement(LazyCandlestick, p);

const LazyHeatmap = lazy(() => import('./impl/finance/heatmap').then((m) => ({ default: m.HeatmapImpl })));
const HeatmapComponent: FunctionComponent<JsonRenderComponentProps> = (p) => createElement(LazyHeatmap, p);

const LazyTreemap = lazy(() => import('./impl/finance/treemap').then((m) => ({ default: m.TreemapImpl })));
const TreemapComponent: FunctionComponent<JsonRenderComponentProps> = (p) => createElement(LazyTreemap, p);

const advancedGrid = defineCatalogComponent({
  type: 'AdvancedGrid',
  definition: {
    props: z.object({
      data: rows,
      // .nullish() on nested fields: models omit keys they don't need, and
      // json-render's .nullable() convention would treat that as an error.
      columns: z.array(
        z.object({
          field: z.string(),
          headerName: z.string().nullish(),
          format: z.enum(['currency', 'percent', 'number', 'delta', 'raw', 'text', 'string', 'price', 'money', 'usd', 'pct', 'int', 'integer']).nullish(),
          // Models emit many pinning dialects ('left', booleans, 'none',
          // string 'false'); accept any string/boolean — the impl honors
          // 'left'/'right'/true and ignores the rest.
          pinned: z.union([z.boolean(), z.string()]).nullish(),
          width: z.number().nullish(),
        }),
      ),
      height: z.number().nullable(),
      filterable: z.boolean().nullable(),
    }),
    description:
      'Sortable/filterable data table (AG Grid Community). Use for larger or more interactive tabular data than DataGrid — set `filterable: true` to enable per-column filters, `pinned` to freeze key columns, `format: "delta"` to color positive/negative values.',
  },
  component: AdvancedGridComponent,
});

const candlestickChart = defineCatalogComponent({
  type: 'CandlestickChart',
  definition: {
    props: z.object({
      data: rows,
      showVolume: z.boolean().nullable(),
      height: z.number().nullable(),
    }),
    description:
      'OHLC price history for one symbol; data rows need time/open/high/low/close/volume — bind /data/ohlc/<SYMBOL>. Set `showVolume: true` to add a volume bar panel below the candles.',
  },
  component: CandlestickComponent,
});

const heatmap = defineCatalogComponent({
  type: 'Heatmap',
  definition: {
    props: z.object({
      data: rows,
      xKey: z.string(),
      yKey: z.string(),
      valueKey: z.string(),
      height: z.number().nullable(),
    }),
    description:
      'Two-dimensional category heatmap (e.g. sector x day correlation/performance grid). `xKey`/`yKey` name the category fields, `valueKey` the numeric field driving color intensity.',
  },
  component: HeatmapComponent,
});

const treemap = defineCatalogComponent({
  type: 'Treemap',
  definition: {
    props: z.object({
      data: rows,
      nameKey: z.string().nullable(),
      valueKey: z.string().nullable(),
      height: z.number().nullable(),
    }),
    description:
      'Single-level treemap of relative sizes (e.g. portfolio allocation by holding). Set nameKey/valueKey to pick fields from the rows (e.g. nameKey "symbol", valueKey "pnl"); tile size uses the absolute value.',
  },
  component: TreemapComponent,
});

export const financeExtensions: CatalogExtension[] = [advancedGrid, candlestickChart, heatmap, treemap];
