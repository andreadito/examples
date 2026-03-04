import type {
  EmailBlock,
  DataSource,
  FetchDataSource,
  WebSocketDataSource,
  ResolveResult,
  OnProgressCallback,
} from '../types/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_WS_TIMEOUT_MS = 10_000;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolve all data sources in the given blocks in parallel.
 * Blocks without a dataSource pass through unchanged.
 * Returns a new array of blocks with data injected.
 */
export async function resolveDataSources(
  blocks: EmailBlock[],
  onProgress?: OnProgressCallback,
): Promise<ResolveResult> {
  const totalStart = performance.now();

  const results = await Promise.all(
    blocks.map(async (block, index) => {
      if (!('dataSource' in block) || !block.dataSource) {
        onProgress?.({
          event: 'resolve:block',
          jobId: '',
          timestamp: Date.now(),
          data: { blockIndex: index, blockType: block.type, status: 'skip' },
        });
        return {
          block,
          index,
          type: block.type,
          hadDataSource: false,
          resolveTimeMs: 0,
        };
      }

      const sourceKind = block.dataSource.kind;
      onProgress?.({
        event: 'resolve:block',
        jobId: '',
        timestamp: Date.now(),
        data: { blockIndex: index, blockType: block.type, status: 'fetching', dataSourceKind: sourceKind },
      });

      const start = performance.now();
      try {
        const rawData = await fetchFromSource(block.dataSource);
        const data = block.dataSource.transform
          ? extractByDotPath(rawData, block.dataSource.transform)
          : rawData;

        const resolvedBlock = injectData(block, data);
        const resolveTimeMs = Math.round(performance.now() - start);

        onProgress?.({
          event: 'resolve:block',
          jobId: '',
          timestamp: Date.now(),
          data: { blockIndex: index, blockType: block.type, status: 'done', resolveTimeMs },
        });

        return {
          block: resolvedBlock,
          index,
          type: block.type,
          hadDataSource: true,
          resolveTimeMs,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Data source error for block ${index} (${block.type}):`, message);

        onProgress?.({
          event: 'resolve:block',
          jobId: '',
          timestamp: Date.now(),
          data: { blockIndex: index, blockType: block.type, status: 'error', error: message },
        });

        return {
          block,
          index,
          type: block.type,
          hadDataSource: true,
          resolveTimeMs: Math.round(performance.now() - start),
          error: message,
        };
      }
    }),
  );

  return {
    resolvedBlocks: results.map((r) => r.block),
    resolveTimeMs: Math.round(performance.now() - totalStart),
    blockResults: results.map(({ index, type, hadDataSource, resolveTimeMs, error }) => ({
      index,
      type,
      hadDataSource,
      resolveTimeMs,
      ...(error ? { error } : {}),
    })),
  };
}

// ─── Source Dispatcher ──────────────────────────────────────────────────────

async function fetchFromSource(source: DataSource): Promise<unknown> {
  switch (source.kind) {
    case 'fetch':
      return fetchHttp(source);
    case 'websocket':
      return fetchWebSocket(source);
    default:
      throw new Error(`Unknown data source kind: ${(source as DataSource).kind}`);
  }
}

// ─── HTTP Fetch ─────────────────────────────────────────────────────────────

async function fetchHttp(source: FetchDataSource): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(source.url, {
      ...source.options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ─── WebSocket Request-Response ─────────────────────────────────────────────

async function fetchWebSocket(source: WebSocketDataSource): Promise<unknown> {
  const { default: WebSocket } = await import('ws');
  const timeoutMs = source.timeoutMs ?? DEFAULT_WS_TIMEOUT_MS;

  return new Promise<unknown>((resolve, reject) => {
    const ws = new WebSocket(source.url);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`WebSocket timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ws.on('open', () => {
      const payload =
        typeof source.message === 'string'
          ? source.message
          : JSON.stringify(source.message);
      ws.send(payload);
    });

    ws.on('message', (data) => {
      clearTimeout(timer);
      ws.close();
      try {
        resolve(JSON.parse(data.toString()));
      } catch {
        resolve(data.toString());
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      ws.close();
      reject(err);
    });
  });
}

// ─── Dot-Path Transform ─────────────────────────────────────────────────────

function extractByDotPath(data: unknown, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = data;

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      throw new Error(
        `Cannot traverse path "${path}": hit non-object at segment "${segment}"`,
      );
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

// ─── Data Injection ─────────────────────────────────────────────────────────

function injectData(block: EmailBlock, data: unknown): EmailBlock {
  switch (block.type) {
    case 'table':
      if (!Array.isArray(data)) {
        throw new Error(`Table dataSource must resolve to an array, got ${typeof data}`);
      }
      return { ...block, rowData: data as Record<string, unknown>[] };

    case 'chart':
      return {
        ...block,
        chartOptions: { ...block.chartOptions, data },
      };

    default:
      return { ...block, data } as EmailBlock;
  }
}
