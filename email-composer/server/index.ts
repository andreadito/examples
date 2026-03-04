import { createServer, type IncomingMessage } from 'node:http';
import { composeEmail } from '../src/engine/composeEmail.ts';
import { initRenderer, destroyRenderer } from '../../email-chart/server/chartRenderer.ts';
import { dailyReportBlocks, dailyReportTemplate } from '../src/demo/DailyTradingReport.ts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

async function buildDemoPage(): Promise<string> {
  const result = await composeEmail(dailyReportBlocks, dailyReportTemplate);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Composer — Server Demo</title>
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
    .timing {
      max-width: 900px;
      margin: 0 auto 1.5rem;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 1rem 1.5rem;
    }
    .timing h3 {
      font-size: 0.85rem;
      color: #1e3a5f;
      margin-bottom: 0.5rem;
    }
    .timing table {
      width: 100%;
      font-size: 0.8rem;
      border-collapse: collapse;
    }
    .timing td, .timing th {
      text-align: left;
      padding: 4px 8px;
      border-bottom: 1px solid #eee;
    }
    .timing th { color: #666; font-weight: 600; }
    .email-frame {
      max-width: 900px;
      margin: 0 auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 1.5rem;
    }
    .email-frame h3 {
      font-size: 0.85rem;
      color: #1e3a5f;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e3e8ee;
    }
    iframe {
      width: 100%;
      border: 1px solid #e3e8ee;
      border-radius: 4px;
      min-height: 900px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Email Composer — Server Demo</h1>
    <p>Composing tables + charts into a single email-safe HTML document</p>
    <div class="badge">✓ Total render: ${result.renderTimeMs}ms — ${result.blockResults.length} blocks</div>
  </header>
  <div class="timing">
    <h3>Block Render Times</h3>
    <table>
      <tr><th>#</th><th>Type</th><th>Time</th></tr>
      ${result.blockResults.map((b) => `<tr><td>${b.index}</td><td>${b.type}</td><td>${b.renderTimeMs}ms</td></tr>`).join('')}
    </table>
  </div>
  <div class="email-frame">
    <h3>Composed Email Preview</h3>
    <iframe srcdoc="${escapeAttr(result.html)}" sandbox="allow-same-origin"></iframe>
  </div>
</body>
</html>`;
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── HTTP Server ────────────────────────────────────────────────────────────

const PORT = 3003;

async function main() {
  await initRenderer();
  console.log('Chart renderer initialised for email composer');

  const server = createServer(async (req, res) => {
    try {
      // POST /api/compose — compose email from blocks
      if (req.url === '/api/compose' && req.method === 'POST') {
        const body = await readBody(req);
        const { blocks, template } = JSON.parse(body);
        const result = await composeEmail(blocks, template);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(result));
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
    console.log(`Email composer server at http://localhost:${PORT}`);
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
