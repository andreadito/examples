import type { EChartsOption } from 'echarts';
import type { JsonRenderComponentProps } from '../../extension';
import { EChart } from './EChart';

type Row = Record<string, unknown>;

function buildOption(rows: Row[], xKey: string, yKey: string): EChartsOption {
  const xCats = Array.from(new Set(rows.map((r) => String(r[xKey] ?? ''))));
  const yCats = Array.from(new Set(rows.map((r) => String(r[yKey] ?? ''))));
  const values = rows
    .map((r) => {
      const xi = xCats.indexOf(String(r[xKey] ?? ''));
      const yi = yCats.indexOf(String(r[yKey] ?? ''));
      const n = Number(r.value);
      return [xi, yi, Number.isFinite(n) ? n : 0];
    })
    .filter(([xi, yi]) => xi >= 0 && yi >= 0);
  const max = values.reduce((m, v) => Math.max(m, Number(v[2]) || 0), 0);
  const min = values.reduce((m, v) => Math.min(m, Number(v[2]) || 0), 0);

  return {
    grid: { left: 80, right: 16, top: 16, bottom: 60 },
    xAxis: { type: 'category', data: xCats, splitArea: { show: true } },
    yAxis: { type: 'category', data: yCats, splitArea: { show: true } },
    visualMap: { min, max, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, type: 'continuous' },
    series: [{ type: 'heatmap', data: values as [number, number, number][] }],
    tooltip: { position: 'top' },
  };
}

export function HeatmapImpl({ props }: JsonRenderComponentProps) {
  const rows = Array.isArray(props.data) ? (props.data as Row[]) : [];
  const xKey = String(props.xKey ?? '');
  const yKey = String(props.yKey ?? '');
  const valueKey = String(props.valueKey ?? '');
  const normalized = rows.map((r) => ({ ...r, value: r[valueKey] }));
  const height = (props.height as number | null | undefined) ?? 300;
  const option = buildOption(normalized, xKey, yKey);
  return <EChart option={option} height={height} />;
}
