// ─── Renderer Registry Types ────────────────────────────────────────────────

export interface RenderContext {
  template: Required<EmailTemplateConfig>;
}

export type BlockRenderer<T extends EmailBlock = EmailBlock> = (
  block: T,
  ctx: RenderContext,
) => Promise<string>;

// ─── Data Source Types ──────────────────────────────────────────────────────

export interface FetchDataSource {
  kind: 'fetch';
  url: string;
  options?: RequestInit;
  /** Dot-path to extract data from response, e.g. "result.rows" */
  transform?: string;
}

export interface WebSocketDataSource {
  kind: 'websocket';
  url: string;
  /** JSON-serializable message to send */
  message: unknown;
  /** Dot-path to extract data from response */
  transform?: string;
  /** Timeout in ms (default: 10000) */
  timeoutMs?: number;
}

export type DataSource = FetchDataSource | WebSocketDataSource;

// ─── Block Types (extensible union) ─────────────────────────────────────────

export type EmailBlock =
  | TableBlock
  | ChartBlock
  | TextBlock
  | DividerBlock
  | CustomBlock;

export interface TableBlock {
  type: 'table';
  rowData?: Record<string, unknown>[];
  colDefs: Record<string, unknown>[];
  title?: string;
  dataSource?: DataSource;
}

export interface ChartBlock {
  type: 'chart';
  chartOptions: Record<string, unknown>;
  width?: number;
  height?: number;
  title?: string;
  dataSource?: DataSource;
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

// ─── Resolve Result ─────────────────────────────────────────────────────────

export interface ResolveResult {
  resolvedBlocks: EmailBlock[];
  resolveTimeMs: number;
  blockResults: {
    index: number;
    type: string;
    hadDataSource: boolean;
    resolveTimeMs: number;
    error?: string;
  }[];
}

// ─── Pipeline Progress Types ────────────────────────────────────────────────

export type PipelineEventType =
  | 'pipeline:start'
  | 'resolve:start'
  | 'resolve:block'
  | 'resolve:complete'
  | 'render:start'
  | 'render:block'
  | 'render:complete'
  | 'assembly:start'
  | 'assembly:complete'
  | 'pipeline:done'
  | 'pipeline:error';

export interface PipelineEvent {
  event: PipelineEventType;
  jobId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export type OnProgressCallback = (event: PipelineEvent) => void;
