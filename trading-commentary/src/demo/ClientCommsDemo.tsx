import { useState, useMemo } from 'react';
import type { CommentaryConfig } from '../types';
import { TradingCommentary } from '../engine/TradingCommentary';
import { buildCategories } from '../engine/buildCategories';
import { buildReplacer } from '../engine/buildReplacer';

// ─── Config ─────────────────────────────────────────────────────────────────

const clientCommsConfig: CommentaryConfig = {
  id: 'client-comms',
  title: 'Client Communication',
  description: 'Trade confirmation and portfolio update for client distribution.',
  placeholderPrefix: ':::',
  editor: {
    height: 380,
    showPreview: true,
    toolbar: ['bold', 'italic', 'heading', 'unordered-list', 'ordered-list', 'table', 'link'],
    maxLength: 3000,
  },
  defaultContent: `## Portfolio Update — :::account.name

Dear :::client.name,

Please find below your portfolio summary as of :::account.date.

### Account Overview
- **Account:** :::account.id
- **Strategy:** :::account.strategy
- **AUM:** :::account.aum
- **MTD Return:** :::performance.mtd
- **YTD Return:** :::performance.ytd

### Recent Activity
We executed the following trades on your behalf:

| Action | Instrument | Quantity | Price | Value |
|--------|-----------|----------|-------|-------|
| :::trade1.side | :::trade1.instrument | :::trade1.quantity | :::trade1.price | :::trade1.value |
| :::trade2.side | :::trade2.instrument | :::trade2.quantity | :::trade2.price | :::trade2.value |

### Performance Attribution
Your portfolio returned :::performance.mtd month-to-date, compared to the benchmark return of :::performance.benchmarkMtd. The :::performance.topContributor position was the largest contributor at :::performance.topContribution.

### Outlook
Current cash allocation stands at :::account.cashPct. We remain :::account.positioning given current market conditions.

Best regards,
:::advisor.name
:::advisor.title
`,
};

// ─── Mock Context Data ───────────────────────────────────────────────────────

const mockClientData = {
  client: {
    name: 'James Richardson',
  },
  account: {
    id: 'ACC-78421',
    name: 'Richardson Family Trust',
    date: 'December 6, 2024',
    strategy: 'Balanced Growth',
    aum: '$4.2M',
    cashPct: '8.3%',
    positioning: 'cautiously optimistic',
  },
  performance: {
    mtd: '+1.8%',
    ytd: '+14.7%',
    benchmarkMtd: '+1.2%',
    topContributor: 'NVDA',
    topContribution: '+0.45%',
  },
  trade1: {
    side: 'BUY',
    instrument: 'AAPL',
    quantity: '150',
    price: '$142.50',
    value: '$21,375',
  },
  trade2: {
    side: 'SELL',
    instrument: 'XOM',
    quantity: '200',
    price: '$104.30',
    value: '$20,860',
  },
  advisor: {
    name: 'Sarah Chen',
    title: 'Senior Portfolio Manager',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ClientCommsDemo() {
  const [content, setContent] = useState(clientCommsConfig.defaultContent ?? '');
  const categories = useMemo(() => buildCategories(mockClientData), []);
  const replacer = useMemo(() => buildReplacer(mockClientData), []);

  return (
    <TradingCommentary
      config={clientCommsConfig}
      value={content}
      onChange={setContent}
      replacer={replacer}
      categories={categories}
    />
  );
}
