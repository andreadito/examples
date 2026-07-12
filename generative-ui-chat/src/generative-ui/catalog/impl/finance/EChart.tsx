import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { useTheme } from '@mui/material/styles';

/**
 * Base ECharts wrapper: owns the chart instance lifecycle (init/dispose),
 * resizes it to its container via ResizeObserver, and re-applies `option`
 * with `notMerge: true` whenever it changes (option identity changes on
 * every render since callers rebuild it from props each time).
 *
 * ECharts does not read the MUI theme, so the wrapper bridges it: the chart
 * re-initializes with ECharts' built-in 'dark' theme when the MUI palette
 * mode flips, with a transparent background so the Card surface shows through.
 *
 * jsdom cannot run canvas/ECharts, so this component is not mounted in
 * tests — only exercised indirectly via the catalog-level tests in
 * financeExtensions.test.ts.
 */
export function EChart({ option, height }: { option: EChartsOption; height: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const mode = useTheme().palette.mode;
  const optionRef = useRef(option);
  optionRef.current = option;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el, mode === 'dark' ? 'dark' : undefined);
    chartRef.current = chart;
    chart.setOption({ backgroundColor: 'transparent', ...optionRef.current }, { notMerge: true });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    chartRef.current?.setOption({ backgroundColor: 'transparent', ...option }, { notMerge: true });
  }, [option]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
