import { useState, useMemo } from 'react';
import type { CommentaryConfig } from '../types';
import { TradingCommentary } from '../engine/TradingCommentary';
import { buildCategories } from '../engine/buildCategories';
import { buildReplacer } from '../engine/buildReplacer';

// ─── Config ─────────────────────────────────────────────────────────────────

const riskReportConfig: CommentaryConfig = {
  id: 'risk-report',
  title: 'Daily Risk Report',
  description: 'End-of-day portfolio risk summary with exposure and limit data.',
  placeholderPrefix: ':::',
  editor: {
    height: 400,
    showPreview: true,
    toolbar: ['bold', 'italic', 'heading', 'unordered-list', 'table', 'code'],
    maxLength: 4000,
  },
  defaultContent: `## Risk Report — :::portfolio.date

**Portfolio:** :::portfolio.name | **NAV:** :::portfolio.nav | **Daily P&L:** :::portfolio.dailyPnl

### Exposure Summary
| Measure | Value | Limit | Utilization |
|---------|-------|-------|-------------|
| Gross Exposure | :::exposure.gross | :::limits.grossLimit | :::limits.grossUtil |
| Net Exposure | :::exposure.net | :::limits.netLimit | :::limits.netUtil |
| Long MV | :::exposure.longMv | — | — |
| Short MV | :::exposure.shortMv | — | — |

### Value at Risk
- **VaR (95%, 1d):** :::var.oneDay95
- **VaR (99%, 1d):** :::var.oneDay99
- **CVaR (95%):** :::var.cvar95
- **Stress VaR:** :::var.stress

### Concentration
Top 5 positions account for :::concentration.top5 of NAV. Largest single name: :::concentration.largestName at :::concentration.largestWeight.

### Sector Breakdown
| Sector | Weight | P&L |
|--------|--------|-----|
| Technology | :::sectors.techWeight | :::sectors.techPnl |
| Financials | :::sectors.finWeight | :::sectors.finPnl |
| Healthcare | :::sectors.hcWeight | :::sectors.hcPnl |
| Energy | :::sectors.energyWeight | :::sectors.energyPnl |

### Limit Breaches
:::breaches.status
`,
};

// ─── Mock Context Data ───────────────────────────────────────────────────────

const mockRiskData = {
  portfolio: {
    name: 'Global Alpha Fund',
    date: '2024-12-06',
    nav: '$285.4M',
    dailyPnl: '+$1.23M',
  },
  exposure: {
    gross: '$412.8M',
    net: '$87.3M',
    longMv: '$250.1M',
    shortMv: '$162.7M',
  },
  limits: {
    grossLimit: '$500M',
    grossUtil: '82.6%',
    netLimit: '$150M',
    netUtil: '58.2%',
  },
  var: {
    oneDay95: '$2.14M',
    oneDay99: '$3.87M',
    cvar95: '$2.91M',
    stress: '$6.42M',
  },
  concentration: {
    top5: '31.4%',
    largestName: 'NVDA',
    largestWeight: '8.7%',
  },
  sectors: {
    techWeight: '34.2%',
    techPnl: '+$620K',
    finWeight: '22.1%',
    finPnl: '+$310K',
    hcWeight: '15.8%',
    hcPnl: '-$45K',
    energyWeight: '11.3%',
    energyPnl: '+$180K',
  },
  breaches: {
    status: 'No limit breaches reported today.',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function RiskReportDemo() {
  const [content, setContent] = useState(riskReportConfig.defaultContent ?? '');
  const categories = useMemo(() => buildCategories(mockRiskData), []);
  const replacer = useMemo(() => buildReplacer(mockRiskData), []);

  return (
    <TradingCommentary
      config={riskReportConfig}
      value={content}
      onChange={setContent}
      replacer={replacer}
      categories={categories}
    />
  );
}
