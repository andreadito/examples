import { useEffect, useRef, useState } from 'react';
import { createBook, createInitialOhlc, createInitialPositions, nextNews, tick } from './ticker';
import type { NewsItem, OhlcBar, OrderBook, Position } from './ticker';

export interface TickerState {
  positions: Position[];
  ohlc: Record<string, OhlcBar[]>;
  book: Record<string, OrderBook>;
  news: NewsItem[];
  asOf: number;
}

function createInitialState(): TickerState {
  const positions = createInitialPositions();
  const ohlc = createInitialOhlc(positions);
  let news: NewsItem[] = [];
  for (let i = 0; i < 6; i++) news = nextNews(news, positions);
  return { positions, ohlc, book: createBook(positions), news, asOf: Date.now() };
}

const NEWS_EVERY_N_TICKS = 4;

/** Live-ticking positions, OHLC history, market depth, and news headlines. */
export function useTicker(intervalMs = 1000): TickerState {
  const [state, setState] = useState<TickerState>(createInitialState);
  const tickCount = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickCount.current += 1;
      const withNews = tickCount.current % NEWS_EVERY_N_TICKS === 0;
      setState((prev) => {
        const next = tick(prev.positions, prev.ohlc);
        return {
          positions: next.positions,
          ohlc: next.ohlc,
          book: createBook(next.positions),
          news: withNews ? nextNews(prev.news, next.positions) : prev.news,
          asOf: Date.now(),
        };
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return state;
}
