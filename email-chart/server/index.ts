import { createServer, type IncomingMessage } from 'node:http';
import { initRenderer, renderChart, destroyRenderer } from './chartRenderer';

import { lineChartOptions, lineChartData } from '../src/demo/LineChartDemo';
import { barChartOptions, barChartData } from '../src/demo/BarChartDemo';
import { pieDonutOptions, pieDonutData } from '../src/demo/PieDonutDemo';
import { scatterChartOptions, scatterChartData } from '../src/demo/CandlestickDemo';
import { areaChartOptions, areaChartData } from '../src/demo/AreaChartDemo';

// ─── Demo Definitions ───────────────────────────────────────────────────────

const demos = [
  { title: 'Line Chart — Monthly Revenue', options: lineChartOptions, data: lineChartData },
  { title: 'Bar Chart — Quarterly Performance', options: barChartOptions, data: barChartData },
  { title: 'Donut Chart — Portfolio Allocation', options: pieDonutOptions, data: pieDonutData },
  { title: 'Bubble Chart — Risk vs Return', options: scatterChartOptions, data: scatterChartData },
  { title: 'Stacked Area — Cumulative P&L', options: areaChartOptions, data: areaChartData },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

async function buildDemoPage(): Promise<string> {
  const sections: string[] = [];

  for (const demo of demos) {
    const chartOptions = { ...demo.options, data: demo.data };
    try {
      const result = await renderChart({
        chartOptions,
        width: 800,
        height: 400,
      });
      sections.push(`
      <section>
        <h2>${demo.title}</h2>
        <p class="meta">Rendered in ${result.renderTimeMs}ms</p>
        <img src="${result.dataUrl}" alt="${demo.title}" width="800" height="400" />
      </section>`);
    } catch (err) {
      sections.push(`
      <section>
        <h2>${demo.title}</h2>
        <p class="error">Error: ${err instanceof Error ? err.message : String(err)}</p>
      </section>`);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Chart — Server-Side Rendered</title>
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
      max-width: 900px;
      margin: 0 auto 2.5rem;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 1.5rem;
      text-align: center;
    }
    section h2 {
      font-size: 1rem;
      color: #1e3a5f;
      margin-bottom: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e3e8ee;
      text-align: left;
    }
    section .meta {
      font-size: 0.75rem;
      color: #888;
      margin-bottom: 1rem;
      text-align: left;
    }
    section .error {
      color: #dc2626;
      font-weight: 600;
    }
    section img {
      max-width: 100%;
      height: auto;
      border: 1px solid #e3e8ee;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Email Chart — Server-Side Rendered</h1>
    <p>Puppeteer + ag-Charts: <code>renderChart()</code> → PNG for email embedding</p>
    <div class="badge">✓ Rendered via headless browser with ag-Charts SSR</div>
  </header>
  ${sections.join('\n')}
</body>
</html>`;
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const PORT = 3002;

async function main() {
  await initRenderer();

  const server = createServer(async (req, res) => {
    try {
      // POST /api/render — render arbitrary chart options
      if (req.url === '/api/render' && req.method === 'POST') {
        const body = await readBody(req);
        const { chartOptions, width, height, fileFormat } = JSON.parse(body);
        const result = await renderChart({ chartOptions, width, height, fileFormat });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({
          dataUrl: result.dataUrl,
          renderTimeMs: result.renderTimeMs,
        }));
        return;
      }

      // CORS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }

      // GET / — demo page
      const html = await buildDemoPage();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      console.error('Server error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  server.listen(PORT, () => {
    console.log(`Chart renderer server at http://localhost:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    await destroyRenderer();
    server.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(console.error);
