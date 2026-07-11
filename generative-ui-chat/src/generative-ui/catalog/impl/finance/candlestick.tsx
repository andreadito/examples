import type { EChartsOption } from 'echarts';
import type { JsonRenderComponentProps } from '../../extension';
import { EChart } from './EChart';

type OhlcRow = { time?: unknown; open?: unknown; high?: unknown; low?: unknown; close?: unknown; volume?: unknown };

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function buildOption(rows: OhlcRow[], showVolume: boolean): EChartsOption {
  const times = rows.map((r) => String(r.time ?? ''));
  // ECharts candlestick series data order is [open, close, low, high].
  const candles = rows.map((r) => [num(r.open), num(r.close), num(r.low), num(r.high)]);
  const volumes = rows.map((r) => ({
    value: num(r.volume),
    itemStyle: { color: num(r.close) >= num(r.open) ? '#2e7d32' : '#d32f2f' },
  }));

  if (!showVolume) {
    return {
      grid: { left: 48, right: 16, top: 16, bottom: 32 },
      xAxis: { type: 'category', data: times, boundaryGap: true },
      yAxis: { type: 'value', scale: true },
      series: [{ type: 'candlestick', data: candles }],
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    };
  }

  return {
    grid: [
      { left: 48, right: 16, top: 16, height: '60%' },
      { left: 48, right: 16, top: '75%', height: '18%' },
    ],
    xAxis: [
      { type: 'category', data: times, boundaryGap: true, gridIndex: 0 },
      { type: 'category', data: times, boundaryGap: true, gridIndex: 1, axisLabel: { show: false } },
    ],
    yAxis: [
      { type: 'value', scale: true, gridIndex: 0 },
      { type: 'value', gridIndex: 1, axisLabel: { show: false } },
    ],
    series: [
      { type: 'candlestick', data: candles, xAxisIndex: 0, yAxisIndex: 0 },
      { type: 'bar', data: volumes, xAxisIndex: 1, yAxisIndex: 1 },
    ],
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
  };
}

export function CandlestickImpl({ props }: JsonRenderComponentProps) {
  const rows = Array.isArray(props.data) ? (props.data as OhlcRow[]) : [];
  const showVolume = !!props.showVolume;
  const height = (props.height as number | null | undefined) ?? 320;
  const option = buildOption(rows, showVolume);
  return <EChart option={option} height={height} />;
}
