import type { BlockRenderer, TableBlock } from '../../types/index.ts';
import { renderToHtml } from '../../../../email-table/src/engine/renderToHtml.ts';
import type { ColDef } from '../../../../email-table/src/types/index.ts';

export const tableRenderer: BlockRenderer<TableBlock> = async (block, ctx) => {
  const tableHtml = renderToHtml(block.rowData, block.colDefs as ColDef[]);

  const titleHtml = block.title
    ? `<h3 style="margin: 0 0 12px 0; font-family: ${ctx.template.fontFamily}; font-size: 16px; font-weight: 600; color: #1e293b;">${block.title}</h3>`
    : '';

  return `<div style="margin: 0; padding: 0;">${titleHtml}${tableHtml}</div>`;
};
