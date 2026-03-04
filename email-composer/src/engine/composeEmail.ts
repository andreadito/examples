import type { EmailBlock, EmailTemplateConfig, ComposeResult } from '../types/index.ts';
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
): Promise<ComposeResult> {
  const totalStart = performance.now();

  // Ensure built-in renderers are registered
  await initBuiltinRenderers();

  const template = mergeDefaults(templateConfig);

  // Render all blocks — async blocks (charts) fire concurrently
  const renderPromises = blocks.map(async (block, index) => {
    const renderer = getBlockRenderer(block.type);
    if (!renderer) {
      return {
        html: `<div style="color: #dc2626; font-weight: 600; font-family: ${template.fontFamily};">Unknown block type: "${block.type}"</div>`,
        type: block.type,
        index,
        renderTimeMs: 0,
      };
    }

    const start = performance.now();
    const html = await renderer(block, { template });
    const renderTimeMs = Math.round(performance.now() - start);

    return { html, type: block.type, index, renderTimeMs };
  });

  const results = await Promise.all(renderPromises);

  // Assemble fragments in order
  const fragments = results.map((r) => r.html);
  const html = wrapEmailHtml(fragments, template);

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
