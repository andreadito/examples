import type { EChartsOption } from 'echarts';
import type { JsonRenderComponentProps } from '../../extension';
import { EChart } from './EChart';

type Row = Record<string, unknown>;

// Rows rarely arrive pre-shaped as {name, value}: models bind raw position
// rows here. Honor explicit nameKey/valueKey props first, then fall back to
// auto-detection (first string-valued key, first finite-numeric key).
function detectKeys(rows: Row[], nameKey?: string, valueKey?: string): { nk: string; vk: string } {
  const sample = rows[0] ?? {};
  let nk = nameKey ?? 'name';
  let vk = valueKey ?? 'value';
  if (sample[nk] === undefined) {
    nk = Object.keys(sample).find((k) => typeof sample[k] === 'string') ?? nk;
  }
  if (sample[vk] === undefined) {
    vk = Object.keys(sample).find((k) => typeof sample[k] === 'number' && Number.isFinite(sample[k] as number)) ?? vk;
  }
  return { nk, vk };
}

function buildOption(rows: Row[], nameKey?: string, valueKey?: string): EChartsOption {
  const { nk, vk } = detectKeys(rows, nameKey, valueKey);
  // Treemap tile areas must be positive; magnitude keeps loss positions visible.
  const data = rows.map((r) => ({ name: String(r[nk] ?? ''), value: Math.abs(Number(r[vk]) || 0) }));
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
  const nameKey = typeof props.nameKey === 'string' ? props.nameKey : undefined;
  const valueKey = typeof props.valueKey === 'string' ? props.valueKey : undefined;
  const option = buildOption(rows, nameKey, valueKey);
  return <EChart option={option} height={height} />;
}
