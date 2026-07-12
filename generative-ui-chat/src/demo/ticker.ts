/**
 * Pure ticker data model for the demo dashboard.
 *
 * `createInitialPositions` / `createInitialOhlc` seed a starting universe;
 * `tick` advances it by one step. All three functions are pure — they never
 * mutate their inputs and carry no module-scoped state. `tick` derives
 * whether to roll a new OHLC bar purely from the wall-clock time and each
 * bar's own `time` field (bucketed into `BAR_DURATION_MS`-wide windows), so
 * no external tick counter is threaded through the API.
 */

export interface Position {
  symbol: string;
  sector: string;
  qty: number;
  avgPrice: number;
  lastPrice: number;
  pnl: number;
  pnlPct: number;
  updatedAt: number;
}

export interface OhlcBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const SYMBOLS: Array<{ symbol: string; sector: string; basePrice: number }> = [
  { symbol: 'AAPL', sector: 'Tech', basePrice: 190 },
  { symbol: 'MSFT', sector: 'Tech', basePrice: 420 },
  { symbol: 'NVDA', sector: 'Tech', basePrice: 130 },
  { symbol: 'GOOG', sector: 'Tech', basePrice: 175 },
  { symbol: 'AMZN', sector: 'Tech', basePrice: 185 },
  { symbol: 'META', sector: 'Tech', basePrice: 590 },
  { symbol: 'JPM', sector: 'Financials', basePrice: 210 },
  { symbol: 'GS', sector: 'Financials', basePrice: 480 },
  { symbol: 'XOM', sector: 'Energy', basePrice: 118 },
  { symbol: 'CVX', sector: 'Energy', basePrice: 160 },
  { symbol: 'JNJ', sector: 'Healthcare', basePrice: 155 },
  { symbol: 'PFE', sector: 'Healthcare', basePrice: 27 },
];

/** Number of bars rolled per 5 ticks, assuming the default 1s tick interval. */
const BAR_DURATION_MS = 5000;
const MAX_BARS = 60;

/** Deterministic string hash -> 32-bit seed (for reproducible seed data). */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — small, fast, deterministic given a seed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createInitialPositions(): Position[] {
  const now = Date.now();
  return SYMBOLS.map(({ symbol, sector, basePrice }) => {
    const rng = mulberry32(hashString(symbol));
    const qty = Math.floor(50 + rng() * 450);
    const avgPrice = basePrice * (0.9 + rng() * 0.2);
    const lastPrice = basePrice;
    const pnl = (lastPrice - avgPrice) * qty;
    const pnlPct = avgPrice !== 0 ? ((lastPrice - avgPrice) / avgPrice) * 100 : 0;
    return { symbol, sector, qty, avgPrice, lastPrice, pnl, pnlPct, updatedAt: now };
  });
}

export function createInitialOhlc(positions: Position[]): Record<string, OhlcBar[]> {
  const now = Date.now();
  const result: Record<string, OhlcBar[]> = {};
  for (const p of positions) {
    const rng = mulberry32(hashString(p.symbol) ^ 0x9e3779b9);
    const bars: OhlcBar[] = [];
    let prevClose = p.avgPrice;
    for (let i = MAX_BARS - 1; i >= 0; i--) {
      const time = now - i * BAR_DURATION_MS;
      const open = prevClose;
      const drift = (rng() - 0.5) * 0.01 * open;
      const close = Math.max(0.01, open + drift);
      const wick = rng() * 0.003 * open;
      const high = Math.max(open, close) + wick;
      const low = Math.max(0.01, Math.min(open, close) - wick);
      const volume = Math.floor(1000 + rng() * 9000);
      bars.push({ time, open, high, low, close, volume });
      prevClose = close;
    }
    // Nudge the most recent bar so it ends at the position's current price,
    // keeping the seeded history continuous with `lastPrice`.
    const last = bars[bars.length - 1];
    if (last) {
      bars[bars.length - 1] = {
        ...last,
        close: p.lastPrice,
        high: Math.max(last.high, p.lastPrice),
        low: Math.min(last.low, p.lastPrice),
      };
    }
    result[p.symbol] = bars;
  }
  return result;
}

function randomWalkPrice(price: number): number {
  const changePct = (Math.random() - 0.5) * 0.01; // +/- 0.5%
  return Math.max(0.01, price * (1 + changePct));
}

function rollBar(bars: OhlcBar[], price: number, now: number): OhlcBar[] {
  const last = bars[bars.length - 1];
  const currentBucket = Math.floor(now / BAR_DURATION_MS);
  const lastBucket = last ? Math.floor(last.time / BAR_DURATION_MS) : currentBucket - 1;

  if (!last || currentBucket !== lastBucket) {
    const newBar: OhlcBar = {
      time: now,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: Math.floor(1000 + Math.random() * 9000),
    };
    return [...bars, newBar].slice(-MAX_BARS);
  }

  const updated: OhlcBar = {
    ...last,
    high: Math.max(last.high, price),
    low: Math.min(last.low, price),
    close: price,
    volume: last.volume + Math.floor(Math.random() * 500),
  };
  return [...bars.slice(0, -1), updated];
}

export function tick(
  positions: Position[],
  ohlc: Record<string, OhlcBar[]>,
): { positions: Position[]; ohlc: Record<string, OhlcBar[]> } {
  const now = Date.now();

  const nextPositions = positions.map((p) => {
    const lastPrice = randomWalkPrice(p.lastPrice);
    const pnl = (lastPrice - p.avgPrice) * p.qty;
    const pnlPct = p.avgPrice !== 0 ? ((lastPrice - p.avgPrice) / p.avgPrice) * 100 : 0;
    return { ...p, lastPrice, pnl, pnlPct, updatedAt: now };
  });

  const nextOhlc: Record<string, OhlcBar[]> = {};
  for (const p of nextPositions) {
    const bars = ohlc[p.symbol] ?? [];
    nextOhlc[p.symbol] = rollBar(bars, p.lastPrice, now);
  }

  return { positions: nextPositions, ohlc: nextOhlc };
}

export interface BookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  bids: BookLevel[];
  asks: BookLevel[];
}

export interface NewsItem {
  time: number;
  symbol: string;
  headline: string;
  source: string;
}

const BOOK_LEVELS = 10;

/**
 * Synthetic market depth per symbol: levels step away from the last price by
 * a few basis points each, with pseudo-random resting size. Regenerated every
 * tick so ladders move like a live book.
 */
export function createBook(positions: Position[]): Record<string, OrderBook> {
  const book: Record<string, OrderBook> = {};
  for (const p of positions) {
    const tickSize = Math.max(0.01, p.lastPrice * 0.0004);
    const bids: BookLevel[] = [];
    const asks: BookLevel[] = [];
    for (let i = 1; i <= BOOK_LEVELS; i++) {
      bids.push({
        price: Number((p.lastPrice - tickSize * i).toFixed(2)),
        size: Math.round(100 + Math.random() * 4000),
      });
      asks.push({
        price: Number((p.lastPrice + tickSize * i).toFixed(2)),
        size: Math.round(100 + Math.random() * 4000),
      });
    }
    book[p.symbol] = { bids, asks };
  }
  return book;
}

const HEADLINE_TEMPLATES: Array<(symbol: string, sector: string) => string> = [
  (s) => `${s} breaks through intraday resistance on heavy volume`,
  (s) => `Options desk reports unusual ${s} call activity into the close`,
  (s, sec) => `${sec} rotation accelerates; ${s} leads sector movers`,
  (s) => `${s} short interest ticks higher, borrow rates firming`,
  (s) => `Block trade crosses in ${s}; institutional accumulation flagged`,
  (s) => `${s} implied vol bid ahead of earnings window`,
  (s, sec) => `Desk color: real-money buyers active in ${sec}, ${s} favored`,
  (s) => `${s} tests VWAP from above; algos defending the level`,
];

const SOURCES = ['DESK', 'WIRE', 'FLOW', 'SQUAWK'];

/** Prepend one synthetic headline, keeping the newest MAX items. */
export function nextNews(news: NewsItem[], positions: Position[], max = 20): NewsItem[] {
  const p = positions[Math.floor(Math.random() * positions.length)];
  const template = HEADLINE_TEMPLATES[Math.floor(Math.random() * HEADLINE_TEMPLATES.length)];
  const item: NewsItem = {
    time: Date.now(),
    symbol: p.symbol,
    headline: template(p.symbol, p.sector),
    source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
  };
  return [item, ...news].slice(0, max);
}
