import type { BlockRenderer, DividerBlock } from '../../types/index.ts';

export const dividerRenderer: BlockRenderer<DividerBlock> = async (block, ctx) => {
  const color = block.color ?? ctx.template.accentColor;
  return `<hr style="border: none; border-top: 1px solid ${color}; margin: 8px 0; opacity: 0.3;" />`;
};
