import type { EChartsOption } from 'echarts';
import type { JsonRenderComponentProps } from '../../extension';
import { EChart } from './EChart';

type Row = { name?: unknown; value?: unknown };

function buildOption(rows: Row[]): EChartsOption {
  const data = rows.map((r) => ({ name: String(r.name ?? ''), value: Number(r.value) || 0 }));
  return {
    series: [
      {
        type: 'treemap',
        data,
        roam: false,
        breadcrumb: { show: false },
        label: { show: true, formatter: '{b}' },
      },
    ],
    tooltip: { formatter: '{b}: {c}' },
  };
}

export function TreemapImpl({ props }: JsonRenderComponentProps) {
  const rows = Array.isArray(props.data) ? (props.data as Row[]) : [];
  const height = (props.height as number | null | undefined) ?? 300;
  const option = buildOption(rows);
  return <EChart option={option} height={height} />;
}
