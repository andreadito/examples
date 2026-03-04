import type { ChartRenderOptions, ChartRenderResult } from '../types';

const DEFAULT_SERVER_URL = 'http://localhost:3002';

/**
 * Send AgChartOptions to the rendering server and get back a base64 data URL.
 * Use this in your email generation pipeline.
 */
export async function renderChartToDataUrl(
  options: ChartRenderOptions & { serverUrl?: string },
): Promise<string> {
  const serverUrl = options.serverUrl ?? DEFAULT_SERVER_URL;
  const res = await fetch(`${serverUrl}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chartOptions: options.chartOptions,
      width: options.width,
      height: options.height,
      fileFormat: options.fileFormat,
    }),
  });

  if (!res.ok) throw new Error(`Render server error: ${res.status}`);
  const result: ChartRenderResult = await res.json();
  return result.dataUrl;
}
