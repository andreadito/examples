import type { ComponentType } from 'react';
import { BarChart as MuiBarChart, LineChart as MuiLineChart, PieChart as MuiPieChart, SparkLineChart } from '@mui/x-charts';
import type { JsonRenderComponentProps } from '../extension';
import type { ColorToken } from '../styleTokens';

type Row = Record<string, unknown>;
const asRows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const asKeys = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

// MUI X Charts' `color` props expect a CSS color, not a palette token name
// (e.g. "success" is not a valid CSS color) — map our color tokens to the
// default MUI palette's `main` shades for chart use.
const CHART_COLOR: Record<string, string> = {
  primary: '#1976d2',
  secondary: '#9c27b0',
  success: '#2e7d32',
  error: '#d32f2f',
  warning: '#ed6c02',
  info: '#0288d1',
};
function chartColor(token: ColorToken | null | undefined): string | undefined {
  return token ? CHART_COLOR[token] : undefined;
}

function LineChartImpl({ props }: JsonRenderComponentProps) {
  const data = asRows(props.data);
  const xKey = String(props.xKey ?? '');
  const yKeys = asKeys(props.yKeys);
  return (
    <MuiLineChart
      dataset={data}
      xAxis={[{ dataKey: xKey, scaleType: 'band' }]}
      series={yKeys.map((k) => ({ dataKey: k, area: !!props.area }))}
      height={(props.height as number | null | undefined) ?? 300}
    />
  );
}

function BarChartImpl({ props }: JsonRenderComponentProps) {
  const data = asRows(props.data);
  const xKey = String(props.xKey ?? '');
  const yKeys = asKeys(props.yKeys);
  return (
    <MuiBarChart
      dataset={data}
      xAxis={[{ dataKey: xKey, scaleType: 'band' }]}
      series={yKeys.map((k) => ({ dataKey: k }))}
      layout={props.horizontal ? 'horizontal' : 'vertical'}
      height={(props.height as number | null | undefined) ?? 300}
    />
  );
}

function PieChartImpl({ props }: JsonRenderComponentProps) {
  const data = asRows(props.data);
  const labelKey = String(props.labelKey ?? '');
  const valueKey = String(props.valueKey ?? '');
  return (
    <MuiPieChart
      series={[
        {
          data: data.map((row, i) => ({ id: i, value: Number(row[valueKey]) || 0, label: String(row[labelKey] ?? '') })),
        },
      ]}
      height={(props.height as number | null | undefined) ?? 300}
    />
  );
}

function SparklineImpl({ props }: JsonRenderComponentProps) {
  const data = asRows(props.data);
  const valueKey = String(props.valueKey ?? '');
  const values = data.map((row) => Number(row[valueKey]) || 0);
  return (
    <SparkLineChart
      data={values}
      height={(props.height as number | null | undefined) ?? 60}
      color={chartColor(props.color as ColorToken | null | undefined)}
    />
  );
}

export const chartComponents: Record<string, ComponentType<JsonRenderComponentProps>> = {
  LineChart: LineChartImpl,
  BarChart: BarChartImpl,
  PieChart: PieChartImpl,
  Sparkline: SparklineImpl,
};
