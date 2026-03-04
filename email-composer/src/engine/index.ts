export { composeEmail } from './composeEmail.ts';
export { resolveDataSources } from './dataResolver.ts';
export { registerBlockRenderer, getBlockRenderer } from './registry.ts';
export type {
  EmailBlock,
  TableBlock,
  ChartBlock,
  TextBlock,
  DividerBlock,
  CustomBlock,
  EmailTemplateConfig,
  ComposeResult,
  ResolveResult,
  BlockRenderer,
  RenderContext,
  DataSource,
  FetchDataSource,
  WebSocketDataSource,
  PipelineEvent,
  PipelineEventType,
  OnProgressCallback,
} from '../types/index.ts';
