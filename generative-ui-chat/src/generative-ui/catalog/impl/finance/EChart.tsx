import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

/**
 * Base ECharts wrapper: owns the chart instance lifecycle (init/dispose),
 * resizes it to its container via ResizeObserver, and re-applies `option`
 * with `notMerge: true` whenever it changes (option identity changes on
 * every render since callers rebuild it from props each time).
 *
 * jsdom cannot run canvas/ECharts, so this component is not mounted in
 * tests — only exercised indirectly via the catalog-level tests in
 * financeExtensions.test.ts.
 */
export function EChart({ option, height }: { option: EChartsOption; height: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
