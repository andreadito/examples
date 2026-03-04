import type { BlockRenderer, TextBlock } from '../../types/index.ts';

export const textRenderer: BlockRenderer<TextBlock> = async (block, ctx) => {
  return `<div style="margin: 0; padding: 0; font-family: ${ctx.template.fontFamily}; font-size: 14px; line-height: 1.6; color: #334155;">${block.html}</div>`;
};
