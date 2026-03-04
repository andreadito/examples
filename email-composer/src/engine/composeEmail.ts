import type { EmailBlock, EmailTemplateConfig, ComposeResult, OnProgressCallback } from '../types/index.ts';
import { initBuiltinRenderers, getBlockRenderer } from './registry.ts';
import { mergeDefaults, wrapEmailHtml } from './htmlWrapper.ts';

/**
 * Compose an array of email blocks into a single email-safe HTML document.
 *
 * Tables render synchronously, charts render in parallel via Puppeteer,
 * and the final HTML is assembled in original block order.
 */
export async function composeEmail(
  blocks: EmailBlock[],
  templateConfig?: EmailTemplateConfig,
  onProgress?: OnProgressCallback,
): Promise<ComposeResult> {
  const totalStart = performance.now();

  // Ensure built-in renderers are registered
  await initBuiltinRenderers();

  const template = mergeDefaults(templateConfig);

  // Render all blocks — async blocks (charts) fire concurrently
  const renderPromises = blocks.map(async (block, index) => {
    const renderer = getBlockRenderer(block.type);
    if (!renderer) {
      onProgress?.({
        event: 'render:block',
        jobId: '',
        timestamp: Date.now(),
        data: { blockIndex: index, blockType: block.type, status: 'error', error: `Unknown block type: "${block.type}"` },
      });
      return {
        html: `<div style="color: #dc2626; font-weight: 600; font-family: ${template.fontFamily};">Unknown block type: "${block.type}"</div>`,
        type: block.type,
        index,
        renderTimeMs: 0,
      };
    }

    onProgress?.({
      event: 'render:block',
      jobId: '',
      timestamp: Date.now(),
      data: { blockIndex: index, blockType: block.type, status: 'rendering' },
    });

    const start = performance.now();
    const html = await renderer(block, { template });
    const renderTimeMs = Math.round(performance.now() - start);

    onProgress?.({
      event: 'render:block',
      jobId: '',
      timestamp: Date.now(),
      data: { blockIndex: index, blockType: block.type, status: 'done', renderTimeMs },
    });

    return { html, type: block.type, index, renderTimeMs };
  });

  const results = await Promise.all(renderPromises);

  // Assemble fragments in order
  onProgress?.({
    event: 'assembly:start',
    jobId: '',
    timestamp: Date.now(),
    data: {},
  });

  const fragments = results.map((r) => r.html);
  const html = wrapEmailHtml(fragments, template);

  onProgress?.({
    event: 'assembly:complete',
    jobId: '',
    timestamp: Date.now(),
    data: {},
  });

  const blockResults = results.map(({ type, index, renderTimeMs }) => ({
    type,
    index,
    renderTimeMs,
  }));

  return {
    html,
    renderTimeMs: Math.round(performance.now() - totalStart),
    blockResults,
  };
}
