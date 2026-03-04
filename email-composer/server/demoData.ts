// ─── Mock Data Generators ────────────────────────────────────────────────────
// Centralized demo data served by both HTTP endpoints and the WebSocket server.
// Each generator includes a small artificial delay to simulate real-world latency.

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Trades ──────────────────────────────────────────────────────────────────

export async function generateTrades(): Promise<{
  result: { trades: Record<string, unknown>[] };
}> {
  await delay(150 + Math.random() * 200); // 150–350ms

  return {
    result: {
      trades: [
        { tradeId: 'T-5001', instrument: 'AAPL', side: 'BUY', quantity: 3200, price: 243.10, status: 'Filled' },
        { tradeId: 'T-5002', instrument: 'MSFT', side: 'SELL', quantity: 1800, price: 456.80, status: 'Filled' },
        { tradeId: 'T-5003', instrument: 'NVDA', side: 'BUY', quantity: 900, price: 941.25, status: 'Filled' },
        { tradeId: 'T-5004', instrument: 'GOOGL', side: 'BUY', quantity: 2100, price: 195.40, status: 'Filled' },
        { tradeId: 'T-5005', instrument: 'AMZN', side: 'SELL', quantity: 1500, price: 228.60, status: 'Partial' },
        { tradeId: 'T-5006', instrument: 'META', side: 'BUY', quantity: 700, price: 614.90, status: 'Filled' },
        { tradeId: 'T-5007', instrument: 'TSLA', side: 'SELL', quantity: 2400, price: 355.20, status: 'Filled' },
        { tradeId: 'T-5008', instrument: 'JPM', side: 'BUY', quantity: 3500, price: 250.15, status: 'Pending' },
      ],
    },
  };
}

// ─── P&L Timeseries ──────────────────────────────────────────────────────────

export async function generatePnlTimeseries(): Promise<{
  data: { timeseries: Record<string, unknown>[] };
}> {
  await delay(100 + Math.random() * 150); // 100–250ms

  return {
    data: {
      timeseries: [
        { time: '09:30', pnl: 0 },
        { time: '10:00', pnl: 32 },
        { time: '10:30', pnl: 58 },
        { time: '11:00', pnl: 95 },
        { time: '11:30', pnl: 78 },
        { time: '12:00', pnl: 120 },
        { time: '12:30', pnl: 145 },
        { time: '13:00', pnl: 132 },
        { time: '13:30', pnl: 168 },
        { time: '14:00', pnl: 195 },
        { time: '14:30', pnl: 210 },
        { time: '15:00', pnl: 238 },
        { time: '15:30', pnl: 265 },
        { time: '16:00', pnl: 292 },
      ],
    },
  };
}

// ─── Risk Desks ──────────────────────────────────────────────────────────────

export async function generateRiskDesks(): Promise<{
  desks: Record<string, unknown>[];
}> {
  await delay(200 + Math.random() * 300); // 200–500ms (simulating WS latency)

  return {
    desks: [
      { desk: 'Equities L/S', var95: '$2.14M', pnlToday: '+$342K', utilization: '42.8%' },
      { desk: 'Fixed Income', var95: '$1.58M', pnlToday: '+$105K', utilization: '52.7%' },
      { desk: 'FX Trading', var95: '$890K', pnlToday: '-$48K', utilization: '44.5%' },
      { desk: 'Commodities', var95: '$1.92M', pnlToday: '+$78K', utilization: '48.0%' },
      { desk: 'Credit Trading', var95: '$3.45M', pnlToday: '-$215K', utilization: '86.3%' },
      { desk: 'Event Driven', var95: '$2.78M', pnlToday: '+$189K', utilization: '92.7%' },
    ],
  };
}

// ─── Positions (Slow) ────────────────────────────────────────────────────────

export async function generatePositions(): Promise<{
  positions: Record<string, unknown>[];
}> {
  await delay(500 + Math.random() * 500); // 500–1000ms

  return {
    positions: [
      { symbol: 'AAPL', quantity: 15000, avgCost: 238.40, marketPrice: 243.10, unrealizedPnl: '+$70.5K', weight: '12.4%' },
      { symbol: 'MSFT', quantity: -8000, avgCost: 448.20, marketPrice: 456.80, unrealizedPnl: '-$68.8K', weight: '8.2%' },
      { symbol: 'NVDA', quantity: 4500, avgCost: 912.50, marketPrice: 941.25, unrealizedPnl: '+$129.4K', weight: '14.8%' },
      { symbol: 'GOOGL', quantity: 12000, avgCost: 188.60, marketPrice: 195.40, unrealizedPnl: '+$81.6K', weight: '7.1%' },
      { symbol: 'AMZN', quantity: -5000, avgCost: 221.30, marketPrice: 228.60, unrealizedPnl: '-$36.5K', weight: '5.9%' },
      { symbol: 'META', quantity: 3200, avgCost: 598.10, marketPrice: 614.90, unrealizedPnl: '+$53.8K', weight: '9.3%' },
      { symbol: 'TSLA', quantity: -6000, avgCost: 342.50, marketPrice: 355.20, unrealizedPnl: '-$76.2K', weight: '6.8%' },
      { symbol: 'JPM', quantity: 10000, avgCost: 244.80, marketPrice: 250.15, unrealizedPnl: '+$53.5K', weight: '5.5%' },
      { symbol: 'V', quantity: 7500, avgCost: 302.10, marketPrice: 308.40, unrealizedPnl: '+$47.3K', weight: '4.8%' },
      { symbol: 'UNH', quantity: 2800, avgCost: 548.90, marketPrice: 562.30, unrealizedPnl: '+$37.5K', weight: '6.2%' },
    ],
  };
}

// ─── Compliance (Very Slow) ──────────────────────────────────────────────────

export async function generateCompliance(): Promise<{
  checks: Record<string, unknown>[];
}> {
  await delay(1000 + Math.random() * 1000); // 1000–2000ms

  return {
    checks: [
      { rule: 'Position Concentration', limit: '15% NAV', current: '14.8%', status: 'Warning', desk: 'Equities' },
      { rule: 'Sector Exposure', limit: '30% NAV', current: '28.2%', status: 'OK', desk: 'All' },
      { rule: 'Single Name VaR', limit: '$5M', current: '$3.87M', status: 'OK', desk: 'Equities' },
      { rule: 'Leverage Ratio', limit: '3.0x', current: '2.4x', status: 'OK', desk: 'All' },
      { rule: 'Credit Quality Min', limit: 'BBB-', current: 'BBB+', status: 'OK', desk: 'Fixed Income' },
      { rule: 'Liquidity Coverage', limit: '100%', current: '142%', status: 'OK', desk: 'All' },
      { rule: 'Counterparty Exposure', limit: '10% NAV', current: '9.7%', status: 'Warning', desk: 'Credit' },
      { rule: 'FX Delta Limit', limit: '$2M', current: '$890K', status: 'OK', desk: 'FX' },
    ],
  };
}

// ─── Correlation Matrix (Slow WS) ───────────────────────────────────────────

export async function generateCorrelationMatrix(): Promise<{
  matrix: Record<string, unknown>[];
}> {
  await delay(800 + Math.random() * 700); // 800–1500ms

  return {
    matrix: [
      { pair: 'AAPL / MSFT', correlation: 0.82, beta: 1.05, period: '90d' },
      { pair: 'AAPL / NVDA', correlation: 0.74, beta: 1.32, period: '90d' },
      { pair: 'MSFT / NVDA', correlation: 0.78, beta: 1.28, period: '90d' },
      { pair: 'GOOGL / META', correlation: 0.71, beta: 0.95, period: '90d' },
      { pair: 'SPY / QQQ', correlation: 0.95, beta: 1.12, period: '90d' },
      { pair: 'TLT / SPY', correlation: -0.42, beta: -0.38, period: '90d' },
      { pair: 'GLD / SPY', correlation: 0.08, beta: 0.05, period: '90d' },
      { pair: 'VIX / SPY', correlation: -0.81, beta: -4.20, period: '90d' },
    ],
  };
}

// ─── Unreliable (Random Failures) ────────────────────────────────────────────

export async function generateUnreliable(): Promise<{
  data: Record<string, unknown>[];
}> {
  await delay(200 + Math.random() * 100); // 200–300ms

  // Fail ~30% of the time
  if (Math.random() < 0.3) {
    throw new Error('Simulated upstream timeout — data source unavailable');
  }

  return {
    data: [
      { metric: 'Order Fill Rate', value: '98.2%', trend: 'up' },
      { metric: 'Avg Latency', value: '2.4ms', trend: 'down' },
      { metric: 'Rejected Orders', value: 12, trend: 'flat' },
      { metric: 'Market Data Gaps', value: 3, trend: 'down' },
    ],
  };
}

// ─── WebSocket Message Handler ───────────────────────────────────────────────

const wsHandlers: Record<string, () => Promise<unknown>> = {
  getRecentTrades: generateTrades,
  getRiskSummary: generateRiskDesks,
  getIntradayPnl: generatePnlTimeseries,
  getPositions: generatePositions,
  getCorrelationMatrix: generateCorrelationMatrix,
  getCompliance: generateCompliance,
};

export async function handleWsMessage(raw: string): Promise<string> {
  let parsed: { action?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return JSON.stringify({ error: 'Invalid JSON' });
  }

  const action = parsed.action;
  if (!action || !wsHandlers[action]) {
    return JSON.stringify({
      error: `Unknown action: "${action}". Available: ${Object.keys(wsHandlers).join(', ')}`,
    });
  }

  try {
    const data = await wsHandlers[action]();
    return JSON.stringify(data);
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
