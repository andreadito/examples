/**
 * A spec written BY HAND — no LLM anywhere near it. This is what the demo's
 * CANVAS mode renders via `GenerativeUICanvas`, proving the rendering half
 * stands alone: the same JSON could come from a database, a CMS, or another
 * AI system given `createAuthoringContext()` as its skill.
 *
 * Dialect rules a human author must follow (also in docs/INTEGRATION.md §9):
 * - every element carries `visible: true`
 * - optional props may be omitted or passed as null (explicit nulls here,
 *   to document each component's full prop surface)
 * - data binds via {"$state": "/data/..."}; derived values via $computed;
 *   two-way inputs via $bindState; interactions via on.press -> emit
 */
export const handAuthoredSpec = {
  root: 'page',
  elements: {
    page: {
      type: 'Stack',
      props: { direction: 'column', gap: 2, wrap: null, sx: null },
      children: ['kpis', 'bookCard', 'sectorCard'],
      visible: true,
    },

    kpis: {
      type: 'Stack',
      props: { direction: 'row', gap: 2, wrap: true, sx: null },
      children: ['equityPnl', 'fxPnl', 'creditPnl'],
      visible: true,
    },
    equityPnl: {
      type: 'StatTile',
      props: { label: 'Equity P&L', value: { $state: '/data/totalPnl' }, format: 'currency', delta: null, color: null, sx: null },
      children: [],
      visible: true,
    },
    fxPnl: {
      type: 'StatTile',
      props: {
        label: 'FX P&L',
        value: { $computed: 'sum', args: { data: { $state: '/data/fx' }, field: 'pnl' } },
        format: 'currency',
        delta: null,
        color: null,
        sx: null,
      },
      children: [],
      visible: true,
    },
    creditPnl: {
      type: 'StatTile',
      props: {
        label: 'Credit P&L',
        value: { $computed: 'sum', args: { data: { $state: '/data/credit' }, field: 'pnl' } },
        format: 'currency',
        delta: null,
        color: null,
        sx: null,
      },
      children: [],
      visible: true,
    },

    bookCard: {
      type: 'Card',
      props: { title: 'Equity book — P&L filter', subtitle: 'Hand-authored spec: slider drives a live filterBy binding', sx: null },
      children: ['threshold', 'bookGrid'],
      visible: true,
    },
    threshold: {
      type: 'Slider',
      props: { label: 'Min P&L', value: { $bindState: '/pnlThreshold' }, min: -20000, max: 20000, step: 500 },
      children: [],
      visible: true,
    },
    bookGrid: {
      type: 'AdvancedGrid',
      props: {
        data: {
          $computed: 'filterBy',
          args: { data: { $state: '/data/positions' }, field: 'pnl', op: 'gte', value: { $state: '/pnlThreshold' } },
        },
        columns: [
          { field: 'symbol', pinned: 'left' },
          { field: 'sector' },
          { field: 'lastPrice', headerName: 'Last', format: 'currency' },
          { field: 'pnl', headerName: 'P&L', format: 'delta' },
          { field: 'pnlPct', headerName: 'P&L %', format: 'percent' },
        ],
        height: 280,
        filterable: null,
      },
      children: [],
      visible: true,
    },

    sectorCard: {
      type: 'Card',
      props: { title: 'P&L by sector', subtitle: null, sx: null },
      children: ['sectorChart'],
      visible: true,
    },
    sectorChart: {
      type: 'BarChart',
      props: {
        data: { $computed: 'aggregateBy', args: { data: { $state: '/data/positions' }, by: 'sector', field: 'pnl', op: 'sum' } },
        xKey: 'key',
        yKeys: ['value'],
        height: 220,
        horizontal: null,
      },
      children: [],
      visible: true,
    },
  },
};
