import puppeteer, { type Browser, type Page } from 'puppeteer';
import { resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChartRenderOptions {
  /** ag-Charts configuration (JSON-serializable subset of AgChartOptions). */
  chartOptions: Record<string, unknown>;
  /** Output image width in pixels. Default: 800 */
  width?: number;
  /** Output image height in pixels. Default: 400 */
  height?: number;
  /** Image format. Default: 'image/png' */
  fileFormat?: 'image/png' | 'image/jpeg';
}

export interface ChartRenderResult {
  /** Base64 data URL string (e.g., "data:image/png;base64,...") */
  dataUrl: string;
  /** Raw PNG/JPEG buffer */
  buffer: Buffer;
  /** MIME type */
  mimeType: string;
  /** Render time in milliseconds */
  renderTimeMs: number;
}

// ─── Module State ────────────────────────────────────────────────────────────

let browser: Browser | null = null;

const AG_CHARTS_UMD_PATH = resolve(
  import.meta.dirname,
  '../node_modules/ag-charts-community/dist/umd/ag-charts-community.js',
);

// ─── Public API ──────────────────────────────────────────────────────────────

/** Launch the headless browser. Call once at server startup. */
export async function initRenderer(): Promise<void> {
  if (browser) return;
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  console.log('Puppeteer browser launched');
}

/** Render an ag-Charts configuration to a PNG/JPEG image. */
export async function renderChart(options: ChartRenderOptions): Promise<ChartRenderResult> {
  if (!browser) throw new Error('Renderer not initialised — call initRenderer() first');

  const start = performance.now();
  const width = options.width ?? 800;
  const height = options.height ?? 400;
  const fileFormat = options.fileFormat ?? 'image/png';

  let page: Page | null = null;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: width + 40, height: height + 40 });

    // Minimal HTML shell with a chart container
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><style>* { margin: 0; padding: 0; } body { background: white; }</style></head>
      <body>
        <div id="chart" style="width: ${width}px; height: ${height}px;"></div>
      </body>
      </html>
    `);

    // Load ag-Charts UMD bundle from the local file system
    await page.addScriptTag({ path: AG_CHARTS_UMD_PATH });

    // Inject chart options and render
    const chartOptionsJson = JSON.stringify(options.chartOptions);

    const dataUrl = await page.evaluate(
      async (optionsJson: string, w: number, h: number, fmt: string) => {
        const opts = JSON.parse(optionsJson);
        opts.container = document.getElementById('chart');
        opts.width = w;
        opts.height = h;
        opts.animation = { enabled: false };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AG = (window as any).agCharts;
        const chart = AG.AgCharts.create(opts);
        await chart.waitForUpdate();

        const url: string = await chart.getImageDataURL({ fileFormat: fmt });
        chart.destroy();
        return url;
      },
      chartOptionsJson,
      width,
      height,
      fileFormat,
    );

    // Convert data URL to buffer
    const base64 = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');
    const mimeType = fileFormat;
    const renderTimeMs = Math.round(performance.now() - start);

    return { dataUrl, buffer, mimeType, renderTimeMs };
  } finally {
    if (page) await page.close();
  }
}

/** Shut down the headless browser gracefully. */
export async function destroyRenderer(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    console.log('Puppeteer browser closed');
  }
}
