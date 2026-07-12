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

// ---------------------------------------------------------------------------
// Multi-desk mock data: FX, rates, and credit desks alongside the equity book.
// Each desk speaks its own market vernacular (pips, bps, DV01, CDS spreads) so
// generated UIs can be exercised against realistically-shaped desk data.
// ---------------------------------------------------------------------------

export interface FxRow {
  pair: string;
  rate: number;
  dayPct: number;
  changePips: number;
  notionalM: number;
  pnl: number;
}

export interface RateRow {
  instrument: string;
  tenor: string;
  yieldPct: number;
  changeBps: number;
  dv01k: number;
  pnl: number;
}

export interface CreditRow {
  name: string;
  kind: 'index' | 'single-name';
  spreadBps: number;
  changeBps: number;
  notionalM: number;
  pnl: number;
}

const FX_PAIRS: Array<{ pair: string; base: number; pipSize: number }> = [
  { pair: 'EUR/USD', base: 1.0845, pipSize: 0.0001 },
  { pair: 'USD/JPY', base: 151.32, pipSize: 0.01 },
  { pair: 'GBP/USD', base: 1.2705, pipSize: 0.0001 },
  { pair: 'USD/CHF', base: 0.8823, pipSize: 0.0001 },
  { pair: 'AUD/USD', base: 0.6588, pipSize: 0.0001 },
  { pair: 'USD/CAD', base: 1.3652, pipSize: 0.0001 },
  { pair: 'EUR/GBP', base: 0.8536, pipSize: 0.0001 },
  { pair: 'USD/CNH', base: 7.2418, pipSize: 0.0001 },
];

const RATE_INSTRUMENTS: Array<{ instrument: string; tenor: string; base: number }> = [
  { instrument: 'UST 2Y', tenor: '2Y', base: 4.62 },
  { instrument: 'UST 5Y', tenor: '5Y', base: 4.31 },
  { instrument: 'UST 10Y', tenor: '10Y', base: 4.22 },
  { instrument: 'UST 30Y', tenor: '30Y', base: 4.45 },
  { instrument: 'Bund 10Y', tenor: '10Y', base: 2.38 },
  { instrument: 'Gilt 10Y', tenor: '10Y', base: 4.05 },
  { instrument: 'JGB 10Y', tenor: '10Y', base: 1.02 },
  { instrument: 'SOFR Swap 5Y', tenor: '5Y', base: 4.08 },
];

const CREDIT_NAMES: Array<{ name: string; kind: CreditRow['kind']; base: number }> = [
  { name: 'CDX.NA.IG 43', kind: 'index', base: 52 },
  { name: 'CDX.NA.HY 43', kind: 'index', base: 332 },
  { name: 'iTraxx Europe 42', kind: 'index', base: 57 },
  { name: 'iTraxx Crossover 42', kind: 'index', base: 305 },
  { name: 'F 5Y CDS', kind: 'single-name', base: 148 },
  { name: 'BA 5Y CDS', kind: 'single-name', base: 121 },
  { name: 'T 5Y CDS', kind: 'single-name', base: 88 },
  { name: 'OXY 5Y CDS', kind: 'single-name', base: 104 },
];

export function createFxDesk(): FxRow[] {
  return FX_PAIRS.map(({ pair, base }) => ({
    pair,
    rate: base,
    dayPct: 0,
    changePips: 0,
    notionalM: Math.round(5 + Math.random() * 95),
    pnl: 0,
  }));
}

export function createRatesDesk(): RateRow[] {
  return RATE_INSTRUMENTS.map(({ instrument, tenor, base }) => ({
    instrument,
    tenor,
    yieldPct: base,
    changeBps: 0,
    dv01k: Math.round(5 + Math.random() * 95),
    pnl: 0,
  }));
}

export function createCreditDesk(): CreditRow[] {
  return CREDIT_NAMES.map(({ name, kind, base }) => ({
    name,
    kind,
    spreadBps: base,
    changeBps: 0,
    notionalM: Math.round(5 + Math.random() * 45),
    pnl: 0,
  }));
}

const walk = (magnitudePct: number) => (Math.random() - 0.5) * 2 * magnitudePct;

/** One tick of the non-equity desks; pure — returns fresh rows. */
export function tickDesks(fx: FxRow[], rates: RateRow[], credit: CreditRow[]) {
  const nextFx = fx.map((row) => {
    const ref = FX_PAIRS.find((p) => p.pair === row.pair) ?? { base: row.rate, pipSize: 0.0001 };
    const rate = Number((row.rate * (1 + walk(0.0008))).toFixed(row.pair.includes('JPY') ? 2 : 4));
    const changePips = Number(((rate - ref.base) / ref.pipSize).toFixed(1));
    const dayPct = Number((((rate - ref.base) / ref.base) * 100).toFixed(2));
    return { ...row, rate, changePips, dayPct, pnl: Number((changePips * row.notionalM * 8).toFixed(0)) };
  });
  const nextRates = rates.map((row) => {
    const ref = RATE_INSTRUMENTS.find((r) => r.instrument === row.instrument) ?? { base: row.yieldPct };
    const yieldPct = Number((row.yieldPct + walk(0.002)).toFixed(3));
    const changeBps = Number(((yieldPct - ref.base) * 100).toFixed(1));
    // Long duration loses when yields rise: pnl = -change * DV01.
    return { ...row, yieldPct, changeBps, pnl: Number((-changeBps * row.dv01k * 10).toFixed(0)) };
  });
  const nextCredit = credit.map((row) => {
    const ref = CREDIT_NAMES.find((c) => c.name === row.name) ?? { base: row.spreadBps };
    const spreadBps = Number((row.spreadBps * (1 + walk(0.004))).toFixed(1));
    const changeBps = Number((spreadBps - ref.base).toFixed(1));
    // Protection seller loses as spreads widen.
    return { ...row, spreadBps, changeBps, pnl: Number((-changeBps * row.notionalM * 45).toFixed(0)) };
  });
  return { fx: nextFx, rates: nextRates, credit: nextCredit };
}
