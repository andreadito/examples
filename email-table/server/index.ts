import { createServer } from 'node:http';
import { renderToHtml } from '../src/engine/renderToHtml';

import { tradeBlotterColDefs, tradeBlotterData } from '../src/demo/TradeBlotterDemo';
import { portfolioColDefs, portfolioData } from '../src/demo/PortfolioHoldingsDemo';
import { riskColDefs, riskData } from '../src/demo/RiskSummaryDemo';
import { employeeColDefs, employeeData } from '../src/demo/EmployeeDirectoryDemo';

// ─── Render all 4 demo tables ───────────────────────────────────────────────

const demos = [
  { title: 'Trade Blotter', colDefs: tradeBlotterColDefs, rowData: tradeBlotterData },
  { title: 'Portfolio Holdings', colDefs: portfolioColDefs, rowData: portfolioData },
  { title: 'Risk Summary', colDefs: riskColDefs, rowData: riskData },
  { title: 'Employee Directory', colDefs: employeeColDefs, rowData: employeeData },
];

function buildPage(): string {
  const tables = demos
    .map(({ title, colDefs, rowData }) => {
      const tableHtml = renderToHtml(rowData, colDefs);
      return `
      <section>
        <h2>${title}</h2>
        ${tableHtml}
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Table — Server-Side Rendered</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f5f5f5;
      color: #333;
      padding: 2rem;
    }
    header {
      text-align: center;
      margin-bottom: 2rem;
    }
    header h1 { font-size: 1.5rem; color: #1e3a5f; }
    header p { color: #666; margin-top: 0.25rem; font-size: 0.9rem; }
    .badge {
      display: inline-block;
      background: #e8f5e9;
      color: #2e7d32;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      margin-top: 0.5rem;
    }
    section {
      max-width: 1100px;
      margin: 0 auto 2.5rem;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 1.5rem;
      overflow-x: auto;
    }
    section h2 {
      font-size: 1rem;
      color: #1e3a5f;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e3e8ee;
    }
    table { border-collapse: collapse; }
  </style>
</head>
<body>
  <header>
    <h1>Email Table — Server-Side Rendered</h1>
    <p>Pure Node.js server using <code>renderToHtml()</code> — no browser, no Vite, no Next.js</p>
    <div class="badge">✓ Rendered on the server with React SSR</div>
  </header>
  ${tables}
</body>
</html>`;
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const PORT = 3001;

const server = createServer((_req, res) => {
  try {
    const html = buildPage();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (err) {
    console.error('Render error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`SSR server running at http://localhost:${PORT}`);
});
