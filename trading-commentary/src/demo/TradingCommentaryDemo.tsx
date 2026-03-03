import { useState, useMemo } from 'react';
import type { CommentaryConfig } from '../types';
import { TradingCommentary } from '../engine/TradingCommentary';
import { buildCategories } from '../engine/buildCategories';
import { buildReplacer } from '../engine/buildReplacer';

// ─── Config (100% JSON-serializable — could come from a DB) ─────────────────
// Note: no categories here — they're derived automatically from context data.

const commentaryConfig: CommentaryConfig = {
  id: 'trade-commentary',
  title: 'Trade Commentary',
  description: 'Write trading commentary with live market data placeholders.',
  placeholderPrefix: ':::',
  editor: {
    height: 380,
    showPreview: true,
    toolbar: ['bold', 'italic', 'heading', 'unordered-list', 'ordered-list', 'code', 'table', 'link'],
    maxLength: 3000,
  },
  defaultContent: `## Daily Commentary — :::instrument.ticker

**:::instrument.name** (:::instrument.exchange) is trading at :::market.price.last, :::market.price.change (:::market.price.changePct) on the day.

### Position Summary
- Current position: **:::position.quantity** shares at avg cost :::position.avgCost
- Market value: :::position.marketValue
- Unrealized P&L: **:::position.pnl** (:::position.pnlPct)

### Market Context
Day range :::market.low — :::market.high. Volume at :::market.volume with VWAP :::market.vwap. Sector: :::instrument.sector.

### Risk
| Metric | Value |
|--------|-------|
| VaR (95%) | :::risk.var |
| Beta | :::risk.beta |
| Sharpe | :::risk.sharpe |
| Max Drawdown | :::risk.maxDrawdown |
`,
};

// ─── Mock Context Data (simulating what would come from a React context) ─────
// This is a nested object — buildCategories and buildReplacer walk it automatically.

const mockContextData = {
  market: {
    price: {
      last: '$142.50',
      bid: '$142.48',
      ask: '$142.52',
      change: '+$2.30',
      changePct: '+1.64%',
    },
    volume: '12,345,678',
    vwap: '$141.87',
    high: '$143.20',
    low: '$140.10',
  },
  position: {
    quantity: '5,000',
    avgCost: '$138.20',
    pnl: '+$21,500',
    pnlPct: '+3.11%',
    marketValue: '$712,500',
  },
  instrument: {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    exchange: 'NASDAQ',
  },
  risk: {
    var: '$8,200',
    beta: '1.15',
    sharpe: '1.82',
    maxDrawdown: '-4.2%',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TradingCommentaryDemo() {
  const [content, setContent] = useState(commentaryConfig.defaultContent ?? '');

  // In production: const contextData = useMarketDataContext();
  // Categories and replacer are derived automatically from the context object.
  const categories = useMemo(() => buildCategories(mockContextData), []);
  const replacer = useMemo(() => buildReplacer(mockContextData), []);

  return (
    <TradingCommentary
      config={commentaryConfig}
      value={content}
      onChange={setContent}
      replacer={replacer}
      categories={categories}
    />
  );
}
