import type { SelectOption } from '../types';

/**
 * Mock API handlers that simulate backend responses.
 * In production, replace `submission.handler` with real fetch calls or remove it
 * to let the engine use the URL-based fetch.
 */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomId(prefix: string): string {
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}-${num}`;
}

/**
 * Simulates a trade order submission endpoint.
 */
export async function mockTradeSubmit(
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  await delay(1200 + Math.random() * 800);

  // Simulate occasional failures
  if (Math.random() < 0.15) {
    throw new Error(
      'Risk check failed: Position limit exceeded for this instrument. Contact your risk manager.',
    );
  }

  return {
    orderId: randomId('ORD'),
    status: 'PENDING',
    instrument: values.instrument,
    side: values.side,
    quantity: values.quantity,
    price: values.price,
    estimatedFillTime: new Date(Date.now() + 60000).toISOString(),
    venue: ['NYSE', 'NASDAQ', 'LSE', 'XETR'][Math.floor(Math.random() * 4)],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Simulates fetching exchanges from an API.
 */
export async function fetchExchanges(): Promise<SelectOption[]> {
  await delay(800 + Math.random() * 400);
  return [
    { value: 'NYSE', label: 'NYSE - New York Stock Exchange' },
    { value: 'NASDAQ', label: 'NASDAQ' },
    { value: 'LSE', label: 'LSE - London Stock Exchange' },
    { value: 'XETR', label: 'XETRA - Frankfurt' },
    { value: 'TSE', label: 'TSE - Tokyo Stock Exchange' },
    { value: 'HKEX', label: 'HKEX - Hong Kong' },
    { value: 'SGX', label: 'SGX - Singapore Exchange' },
    { value: 'ASX', label: 'ASX - Australian Securities Exchange' },
  ];
}

/**
 * Simulates fetching currencies from an API.
 */
export async function fetchCurrencies(): Promise<SelectOption[]> {
  await delay(600 + Math.random() * 300);
  return [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'CHF', label: 'CHF - Swiss Franc' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
    { value: 'HKD', label: 'HKD - Hong Kong Dollar' },
    { value: 'SGD', label: 'SGD - Singapore Dollar' },
  ];
}

/**
 * Simulates fetching counterparties from an API.
 */
export async function fetchCounterparties(): Promise<SelectOption[]> {
  await delay(700 + Math.random() * 300);
  return [
    { value: 'GS', label: 'Goldman Sachs' },
    { value: 'JPM', label: 'JP Morgan' },
    { value: 'MS', label: 'Morgan Stanley' },
    { value: 'BARC', label: 'Barclays' },
    { value: 'DB', label: 'Deutsche Bank' },
    { value: 'CITI', label: 'Citibank' },
    { value: 'HSBC', label: 'HSBC' },
    { value: 'UBS', label: 'UBS' },
    { value: 'CS', label: 'Credit Suisse' },
    { value: 'BNP', label: 'BNP Paribas' },
  ];
}

/**
 * Simulates fetching reference entities for CDS.
 */
export async function fetchReferenceEntities(): Promise<SelectOption[]> {
  await delay(600 + Math.random() * 400);
  return [
    { value: 'AAPL', label: 'Apple Inc.' },
    { value: 'MSFT', label: 'Microsoft Corp.' },
    { value: 'AMZN', label: 'Amazon.com Inc.' },
    { value: 'GOOGL', label: 'Alphabet Inc.' },
    { value: 'META', label: 'Meta Platforms Inc.' },
    { value: 'TSLA', label: 'Tesla Inc.' },
    { value: 'GS', label: 'Goldman Sachs Group' },
    { value: 'JPM', label: 'JPMorgan Chase & Co.' },
    { value: 'BAC', label: 'Bank of America Corp.' },
    { value: 'T', label: 'AT&T Inc.' },
    { value: 'F', label: 'Ford Motor Co.' },
    { value: 'GM', label: 'General Motors Co.' },
  ];
}

/**
 * Simulates a risk parameter configuration endpoint.
 */
export async function mockRiskConfigSubmit(
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  await delay(800 + Math.random() * 600);

  if (Math.random() < 0.1) {
    throw new Error(
      'Configuration conflict: Another user is currently modifying risk parameters. Try again.',
    );
  }

  return {
    configId: randomId('RISK'),
    status: 'APPLIED',
    effectiveFrom: new Date().toISOString(),
    appliedBy: 'current-user',
    parameters: values,
    previousVersion: Math.floor(Math.random() * 50) + 1,
    newVersion: Math.floor(Math.random() * 50) + 51,
  };
}

/**
 * Simulates an FX trade submission endpoint.
 */
export async function mockFxSubmit(
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  await delay(600 + Math.random() * 600);

  if (Math.random() < 0.1) {
    throw new Error('FX trade rejected: Exceeds daily FX exposure limit.');
  }

  return {
    dealId: randomId('FX'),
    status: 'CONFIRMED',
    ccyPair: values.ccyPair,
    rate: (1.05 + Math.random() * 0.1).toFixed(4),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Simulates a CDS trade submission endpoint.
 */
export async function mockCdsSubmit(
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  await delay(1000 + Math.random() * 500);

  if (Math.random() < 0.12) {
    throw new Error('CDS rejected: Reference entity under credit watch. Manual approval required.');
  }

  return {
    tradeId: randomId('CDS'),
    status: 'BOOKED',
    referenceEntity: values.referenceEntity,
    spread: values.spread,
    confirmationRef: randomId('CONF'),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Simulates an equity options submission endpoint.
 */
export async function mockOptionsSubmit(
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  await delay(800 + Math.random() * 700);

  if (Math.random() < 0.1) {
    throw new Error('Options order rejected: Greeks limit exceeded for this underlying.');
  }

  return {
    optionId: randomId('OPT'),
    status: 'PENDING',
    underlying: values.underlying,
    contracts: values.contracts,
    premium: (Math.random() * 15 + 1).toFixed(2),
    impliedVol: (Math.random() * 30 + 15).toFixed(1) + '%',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Simulates a patient intake submission endpoint.
 */
export async function mockPatientIntakeSubmit(
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  await delay(500 + Math.random() * 500);

  return {
    patientId: randomId('PT'),
    status: 'REGISTERED',
    name: `${values.firstName} ${values.lastName}`,
    appointmentDate: values.appointmentDate,
    timestamp: new Date().toISOString(),
  };
}
