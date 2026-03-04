// ─── Re-export ag-Charts types for convenience ──────────────────────────────

export type { AgChartOptions } from 'ag-charts-community';

// ─── Render Options ─────────────────────────────────────────────────────────

export interface ChartRenderOptions {
  /** ag-Charts configuration (JSON-serializable subset). */
  chartOptions: Record<string, unknown>;
  /** Output image width in pixels. Default: 800 */
  width?: number;
  /** Output image height in pixels. Default: 400 */
  height?: number;
  /** Image format. Default: 'image/png' */
  fileFormat?: 'image/png' | 'image/jpeg';
}

export interface ChartRenderResult {
  /** Base64 data URL string */
  dataUrl: string;
  /** Render time in milliseconds */
  renderTimeMs: number;
}
