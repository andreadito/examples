import type { BlockRenderer, EmailBlock } from '../types/index.ts';

// ─── Registry ───────────────────────────────────────────────────────────────

const renderers = new Map<string, BlockRenderer>();

export function registerBlockRenderer<T extends EmailBlock>(
  type: string,
  renderer: BlockRenderer<T>,
): void {
  renderers.set(type, renderer as BlockRenderer);
}

export function getBlockRenderer(type: string): BlockRenderer | undefined {
  return renderers.get(type);
}

// ─── Built-in Registration ──────────────────────────────────────────────────

let initialized = false;

export async function initBuiltinRenderers(): Promise<void> {
  if (initialized) return;

  const { tableRenderer } = await import('./renderers/tableRenderer.ts');
  const { chartRenderer } = await import('./renderers/chartRenderer.ts');
  const { textRenderer } = await import('./renderers/textRenderer.ts');
  const { dividerRenderer } = await import('./renderers/dividerRenderer.ts');

  registerBlockRenderer('table', tableRenderer);
  registerBlockRenderer('chart', chartRenderer);
  registerBlockRenderer('text', textRenderer);
  registerBlockRenderer('divider', dividerRenderer);

  initialized = true;
}
