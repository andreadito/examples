import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolveDataSources } from '../src/engine/dataResolver.ts';
import { composeEmail } from '../src/engine/composeEmail.ts';
import {
  dailyReportBlocks,
  dailyReportTemplate,
  localDemoBlocks,
  heavyLoadBlocks,
  errorBlocks,
  slowBlocks,
} from '../src/demo/DailyTradingReport.ts';
import type {
  EmailBlock,
  EmailTemplateConfig,
  PipelineEvent,
  OnProgressCallback,
  ComposeResult,
} from '../src/types/index.ts';

// ─── Job Store ───────────────────────────────────────────────────────────────

interface PipelineJob {
  id: string;
  status: 'running' | 'done' | 'error';
  events: PipelineEvent[];
  listeners: Set<(event: PipelineEvent) => void>;
  result?: ComposeResult;
  error?: string;
  preset?: string;
  totalBlocks: number;
  startedAt: number;
}

const jobs = new Map<string, PipelineJob>();
const JOB_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Global Listeners ────────────────────────────────────────────────────────
// One SSE connection can receive events from ALL jobs.

const globalListeners = new Set<(event: PipelineEvent) => void>();

export function subscribeGlobal(listener: (event: PipelineEvent) => void): () => void {
  globalListeners.add(listener);
  return () => globalListeners.delete(listener);
}

// ─── Presets ─────────────────────────────────────────────────────────────────

interface Preset {
  blocks: EmailBlock[];
  template?: EmailTemplateConfig;
}

const PRESET_NAMES = ['full', 'datasource', 'static', 'heavy', 'errors', 'slow'] as const;

function getPreset(name: string): Preset | undefined {
  switch (name) {
    case 'full':
      return { blocks: dailyReportBlocks, template: dailyReportTemplate };
    case 'datasource':
      return { blocks: localDemoBlocks, template: dailyReportTemplate };
    case 'static':
      return {
        blocks: dailyReportBlocks.filter((b) => !('dataSource' in b && b.dataSource)),
        template: dailyReportTemplate,
      };
    case 'heavy':
      return { blocks: heavyLoadBlocks, template: dailyReportTemplate };
    case 'errors':
      return { blocks: errorBlocks, template: dailyReportTemplate };
    case 'slow':
      return { blocks: slowBlocks, template: dailyReportTemplate };
    default:
      return undefined;
  }
}

// ─── Job Listing ─────────────────────────────────────────────────────────────

export interface JobSummary {
  id: string;
  status: string;
  preset?: string;
  totalBlocks: number;
  startedAt: number;
  totalTimeMs?: number;
  error?: string;
}

export function getJobList(): JobSummary[] {
  return Array.from(jobs.values())
    .map((job) => ({
      id: job.id,
      status: job.status,
      preset: job.preset,
      totalBlocks: job.totalBlocks,
      startedAt: job.startedAt,
      totalTimeMs: job.result
        ? Math.round(job.result.renderTimeMs)
        : undefined,
      error: job.error,
    }))
    .sort((a, b) => b.startedAt - a.startedAt); // newest first
}

// ─── Job Execution ───────────────────────────────────────────────────────────

function emit(job: PipelineJob, event: PipelineEvent): void {
  // Stamp the jobId
  event.jobId = job.id;
  job.events.push(event);
  for (const listener of job.listeners) {
    listener(event);
  }
  // Broadcast to global listeners (multi-job monitor)
  for (const listener of globalListeners) {
    listener(event);
  }
}

async function runPipeline(job: PipelineJob, blocks: EmailBlock[], template?: EmailTemplateConfig): Promise<void> {
  const pipelineStart = performance.now();

  emit(job, {
    event: 'pipeline:start',
    jobId: job.id,
    timestamp: Date.now(),
    data: { totalBlocks: blocks.length, preset: job.preset },
  });

  // ─── Phase 1: Resolve ────────────────────────────────────────────────

  emit(job, {
    event: 'resolve:start',
    jobId: job.id,
    timestamp: Date.now(),
    data: {},
  });

  const onResolveProgress: OnProgressCallback = (ev) => {
    ev.jobId = job.id;
    emit(job, ev);
  };

  const resolveResult = await resolveDataSources(blocks, onResolveProgress);

  emit(job, {
    event: 'resolve:complete',
    jobId: job.id,
    timestamp: Date.now(),
    data: { resolveTimeMs: resolveResult.resolveTimeMs },
  });

  // ─── Phase 2: Render ─────────────────────────────────────────────────

  emit(job, {
    event: 'render:start',
    jobId: job.id,
    timestamp: Date.now(),
    data: {},
  });

  const onRenderProgress: OnProgressCallback = (ev) => {
    ev.jobId = job.id;
    emit(job, ev);
  };

  const composeResult = await composeEmail(resolveResult.resolvedBlocks, template, onRenderProgress);

  emit(job, {
    event: 'render:complete',
    jobId: job.id,
    timestamp: Date.now(),
    data: { renderTimeMs: composeResult.renderTimeMs },
  });

  // ─── Done ────────────────────────────────────────────────────────────

  job.status = 'done';
  job.result = composeResult;

  emit(job, {
    event: 'pipeline:done',
    jobId: job.id,
    timestamp: Date.now(),
    data: {
      totalTimeMs: Math.round(performance.now() - pipelineStart),
      html: composeResult.html,
    },
  });
}

export function startPipelineJob(
  blocks: EmailBlock[],
  template?: EmailTemplateConfig,
  preset?: string,
): string {
  const id = randomUUID().slice(0, 8);

  const job: PipelineJob = {
    id,
    status: 'running',
    events: [],
    listeners: new Set(),
    preset,
    totalBlocks: blocks.length,
    startedAt: Date.now(),
  };

  jobs.set(id, job);

  // Fire-and-forget — pipeline runs in background
  runPipeline(job, blocks, template).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    job.status = 'error';
    job.error = message;
    emit(job, {
      event: 'pipeline:error',
      jobId: job.id,
      timestamp: Date.now(),
      data: { error: message },
    });
  });

  // Auto-cleanup after TTL
  setTimeout(() => jobs.delete(id), JOB_TTL_MS);

  return id;
}

function subscribeToJob(
  jobId: string,
  listener: (event: PipelineEvent) => void,
): (() => void) | null {
  const job = jobs.get(jobId);
  if (!job) return null;

  // Replay stored events
  for (const event of job.events) {
    listener(event);
  }

  // Subscribe to new events
  job.listeners.add(listener);

  return () => {
    job.listeners.delete(listener);
  };
}

// ─── HTTP Helpers ────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

// ─── Route Handlers ──────────────────────────────────────────────────────────

export async function handlePipelineStart(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readBody(req);
  let blocks: EmailBlock[] | undefined;
  let template: EmailTemplateConfig | undefined;
  let presetName: string | undefined;

  if (body.trim()) {
    const parsed = JSON.parse(body);

    if (parsed.preset) {
      const preset = getPreset(parsed.preset);
      if (!preset) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
          error: `Unknown preset: "${parsed.preset}". Available: ${PRESET_NAMES.join(', ')}`,
        }));
        return;
      }
      blocks = preset.blocks;
      template = preset.template;
      presetName = parsed.preset;
    } else {
      blocks = parsed.blocks;
      template = parsed.template;
      presetName = 'custom';
    }
  }

  if (!blocks) {
    // Default to the local demo blocks
    blocks = localDemoBlocks;
    template = dailyReportTemplate;
    presetName = 'datasource';
  }

  const jobId = startPipelineJob(blocks, template, presetName);

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({ jobId }));
}

export function handlePipelineEvents(req: IncomingMessage, res: ServerResponse, jobId: string): void {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const unsubscribe = subscribeToJob(jobId, (event) => {
    res.write(`event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`);
  });

  if (!unsubscribe) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: `Job "${jobId}" not found` })}\n\n`);
    res.end();
    return;
  }

  // Clean up on client disconnect
  req.on('close', () => {
    unsubscribe();
  });
}

export function handleGlobalEvents(req: IncomingMessage, res: ServerResponse): void {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Global SSE — does NOT replay old events, only streams live events
  const unsubscribe = subscribeGlobal((event) => {
    res.write(`event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
}

export function handleJobList(_req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(getJobList()));
}
