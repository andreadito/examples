import { useEffect, useState } from 'react';
import { createInitialOhlc, createInitialPositions, tick } from './ticker';
import type { OhlcBar, Position } from './ticker';

export interface TickerState {
  positions: Position[];
  ohlc: Record<string, OhlcBar[]>;
  asOf: number;
}

function createInitialState(): TickerState {
  const positions = createInitialPositions();
  const ohlc = createInitialOhlc(positions);
  return { positions, ohlc, asOf: Date.now() };
}

/** Live-ticking positions + OHLC history, advancing on a `setInterval`. */
export function useTicker(intervalMs = 1000): TickerState {
  const [state, setState] = useState<TickerState>(createInitialState);

  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        const next = tick(prev.positions, prev.ohlc);
        return { positions: next.positions, ohlc: next.ohlc, asOf: Date.now() };
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return state;
}
