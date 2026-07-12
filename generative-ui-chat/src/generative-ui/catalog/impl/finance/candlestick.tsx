import type { EChartsOption } from 'echarts';
import { useTheme } from '@mui/material/styles';
import type { JsonRenderComponentProps } from '../../extension';
import { EChart } from './EChart';

type UpDown = { up: string; down: string };

type OhlcRow = { time?: unknown; open?: unknown; high?: unknown; low?: unknown; close?: unknown; volume?: unknown };

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Epoch-ms timestamps (anything past 2001 in ms) render as HH:MM:SS; other
// time values (ISO strings, labels) pass through untouched.
const timeLabel = (v: unknown): string => {
  const n = Number(v);
  if (Number.isFinite(n) && n > 1e12) return new Date(n).toLocaleTimeString();
  return String(v ?? '');
};

function buildOption(rows: OhlcRow[], showVolume: boolean, colors: UpDown): EChartsOption {
  const times = rows.map((r) => timeLabel(r.time));
  // ECharts candlestick series data order is [open, close, low, high].
  const candles = rows.map((r) => [num(r.open), num(r.close), num(r.low), num(r.high)]);
  // ECharts candlestick color = up/bullish, color0 = down/bearish.
  const candleStyle = {
    itemStyle: { color: colors.up, color0: colors.down, borderColor: colors.up, borderColor0: colors.down },
  };
  const volumes = rows.map((r) => ({
    value: num(r.volume),
    itemStyle: { color: num(r.close) >= num(r.open) ? colors.up : colors.down },
  }));

  if (!showVolume) {
    return {
      grid: { left: 48, right: 16, top: 16, bottom: 32 },
      xAxis: { type: 'category', data: times, boundaryGap: true },
      yAxis: { type: 'value', scale: true },
      series: [{ type: 'candlestick', data: candles, ...candleStyle }],
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, valueFormatter: (v) => (typeof v === 'number' ? v.toFixed(2) : String(v ?? '')) },
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
      { type: 'candlestick', data: candles, xAxisIndex: 0, yAxisIndex: 0, ...candleStyle },
      { type: 'bar', data: volumes, xAxisIndex: 1, yAxisIndex: 1 },
    ],
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, valueFormatter: (v) => (typeof v === 'number' ? v.toFixed(2) : String(v ?? '')) },
  };
}

export function CandlestickImpl({ props }: JsonRenderComponentProps) {
  const rows = Array.isArray(props.data) ? (props.data as OhlcRow[]) : [];
  const showVolume = !!props.showVolume;
  const height = (props.height as number | null | undefined) ?? 320;
  const { palette } = useTheme();
  const option = buildOption(rows, showVolume, { up: palette.success.main, down: palette.error.main });
  return <EChart option={option} height={height} />;
}
