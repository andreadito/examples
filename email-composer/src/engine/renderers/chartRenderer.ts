import type { BlockRenderer, ChartBlock } from '../../types/index.ts';
import {
  initRenderer,
  renderChart,
} from '../../../../email-chart/server/chartRenderer.ts';

export const chartRenderer: BlockRenderer<ChartBlock> = async (block, ctx) => {
  await initRenderer();

  const width = block.width ?? 800;
  const height = block.height ?? 400;

  const result = await renderChart({
    chartOptions: block.chartOptions,
    width,
    height,
  });

  const titleHtml = block.title
    ? `<h3 style="margin: 0 0 12px 0; font-family: ${ctx.template.fontFamily}; font-size: 16px; font-weight: 600; color: #1e293b;">${block.title}</h3>`
    : '';

  return `<div style="margin: 0; padding: 0; text-align: center;">
  ${titleHtml}
  <img src="${result.dataUrl}" alt="${block.title ?? 'Chart'}" width="${width}" height="${height}" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border: 0;" />
</div>`;
};
