import { useState, useMemo } from 'react';
import type { CommentaryConfig } from '../types';
import { TradingCommentary } from '../engine/TradingCommentary';
import { buildCategories } from '../engine/buildCategories';
import { buildReplacer } from '../engine/buildReplacer';

// ─── Config ─────────────────────────────────────────────────────────────────

const researchConfig: CommentaryConfig = {
  id: 'research-note',
  title: 'Equity Research Note',
  description: 'Analyst research note with fundamentals and valuation data.',
  placeholderPrefix: ':::',
  editor: {
    height: 420,
    showPreview: true,
    toolbar: ['bold', 'italic', 'heading', 'unordered-list', 'ordered-list', 'table', 'link', 'quote'],
    maxLength: 5000,
  },
  defaultContent: `## :::company.name (:::company.ticker) — Research Update

**Rating:** :::valuation.rating | **Target:** :::valuation.priceTarget | **Current:** :::company.price

### Investment Thesis
:::company.name operates in the :::company.sector sector with a market cap of :::company.marketCap. The company reported :::fundamentals.revenue in revenue (:::fundamentals.revenueGrowth YoY) with :::fundamentals.epsGrowth EPS growth.

### Key Metrics
| Metric | Value |
|--------|-------|
| P/E Ratio | :::valuation.pe |
| Forward P/E | :::valuation.forwardPe |
| EV/EBITDA | :::valuation.evEbitda |
| Dividend Yield | :::fundamentals.dividendYield |
| Debt/Equity | :::fundamentals.debtEquity |
| ROE | :::fundamentals.roe |

### Earnings Summary
- Revenue: :::fundamentals.revenue (:::fundamentals.revenueGrowth YoY)
- EPS: :::fundamentals.eps (:::fundamentals.epsGrowth YoY)
- Gross Margin: :::fundamentals.grossMargin
- Operating Margin: :::fundamentals.operatingMargin
- Free Cash Flow: :::fundamentals.fcf

### Analyst Consensus
> :::valuation.rating with a :::valuation.priceTarget price target, implying :::valuation.upside upside from current levels. Consensus among :::valuation.analystCount analysts.
`,
};

// ─── Mock Context Data ───────────────────────────────────────────────────────

const mockResearchData = {
  company: {
    name: 'Microsoft Corp.',
    ticker: 'MSFT',
    price: '$415.20',
    sector: 'Technology',
    marketCap: '$3.09T',
  },
  fundamentals: {
    revenue: '$62.0B',
    revenueGrowth: '+16.0%',
    eps: '$2.94',
    epsGrowth: '+20.7%',
    grossMargin: '69.4%',
    operatingMargin: '44.6%',
    fcf: '$19.3B',
    dividendYield: '0.72%',
    debtEquity: '0.29',
    roe: '38.5%',
  },
  valuation: {
    pe: '36.8x',
    forwardPe: '31.2x',
    evEbitda: '28.4x',
    rating: 'Overweight',
    priceTarget: '$470.00',
    upside: '+13.2%',
    analystCount: '42',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ResearchNoteDemo() {
  const [content, setContent] = useState(researchConfig.defaultContent ?? '');
  const categories = useMemo(() => buildCategories(mockResearchData), []);
  const replacer = useMemo(() => buildReplacer(mockResearchData), []);

  return (
    <TradingCommentary
      config={researchConfig}
      value={content}
      onChange={setContent}
      replacer={replacer}
      categories={categories}
    />
  );
}
