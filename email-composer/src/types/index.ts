// ─── Renderer Registry Types ────────────────────────────────────────────────

export interface RenderContext {
  template: Required<EmailTemplateConfig>;
}

export type BlockRenderer<T extends EmailBlock = EmailBlock> = (
  block: T,
  ctx: RenderContext,
) => Promise<string>;

// ─── Block Types (extensible union) ─────────────────────────────────────────

export type EmailBlock =
  | TableBlock
  | ChartBlock
  | TextBlock
  | DividerBlock
  | CustomBlock;

export interface TableBlock {
  type: 'table';
  rowData: Record<string, unknown>[];
  colDefs: Record<string, unknown>[];
  title?: string;
}

export interface ChartBlock {
  type: 'chart';
  chartOptions: Record<string, unknown>;
  width?: number;
  height?: number;
  title?: string;
}

export interface TextBlock {
  type: 'text';
  html: string;
}

export interface DividerBlock {
  type: 'divider';
  color?: string;
}

export interface CustomBlock {
  type: string;
  [key: string]: unknown;
}

// ─── Template Config ────────────────────────────────────────────────────────

export interface EmailTemplateConfig {
  title?: string;
  subtitle?: string;
  logoUrl?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  footerHtml?: string;
  fontFamily?: string;
  maxWidth?: number;
  bodyBgColor?: string;
  contentBgColor?: string;
  accentColor?: string;
}

// ─── Compose Result ─────────────────────────────────────────────────────────

export interface ComposeResult {
  html: string;
  renderTimeMs: number;
  blockResults: { type: string; index: number; renderTimeMs: number }[];
}
