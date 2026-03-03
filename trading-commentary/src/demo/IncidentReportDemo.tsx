import { useState, useMemo } from 'react';
import type { CommentaryConfig } from '../types';
import { TradingCommentary } from '../engine/TradingCommentary';
import { buildCategories } from '../engine/buildCategories';
import { buildReplacer } from '../engine/buildReplacer';

// ─── Config ─────────────────────────────────────────────────────────────────
// Non-finance example: engineering incident report with system metrics.

const incidentConfig: CommentaryConfig = {
  id: 'incident-report',
  title: 'Incident Report',
  description: 'Post-incident summary with live system metrics. Non-finance example.',
  placeholderPrefix: ':::',
  editor: {
    height: 400,
    showPreview: true,
    toolbar: ['bold', 'italic', 'heading', 'unordered-list', 'ordered-list', 'code', 'table', 'link'],
    maxLength: 4000,
  },
  defaultContent: `## Incident Report — :::incident.id

**Severity:** :::incident.severity | **Status:** :::incident.status | **Duration:** :::incident.duration

### Summary
Service :::service.name (:::service.environment) experienced degraded performance starting at :::incident.startTime. The incident was detected by :::incident.detectedBy and resolved at :::incident.endTime.

### Impact
- **Affected users:** :::impact.usersAffected
- **Failed requests:** :::impact.failedRequests
- **Error rate peak:** :::impact.errorRatePeak
- **Revenue impact:** :::impact.revenueImpact

### System Metrics at Time of Incident
| Metric | Peak Value | Normal Range |
|--------|-----------|--------------|
| CPU Usage | :::metrics.cpuPeak | :::metrics.cpuNormal |
| Memory | :::metrics.memoryPeak | :::metrics.memoryNormal |
| P99 Latency | :::metrics.latencyPeak | :::metrics.latencyNormal |
| Request Rate | :::metrics.rps | :::metrics.rpsNormal |

### Root Cause
:::incident.rootCause

### Timeline
1. **:::incident.startTime** — Monitoring alert triggered (:::incident.detectedBy)
2. **:::incident.acknowledgedTime** — On-call engineer acknowledged
3. **:::incident.mitigatedTime** — Mitigation deployed (:::incident.mitigation)
4. **:::incident.endTime** — Full resolution confirmed

### Current Status
Service :::service.name is now operating normally. Current error rate: :::metrics.currentErrorRate. Uptime since resolution: :::metrics.uptimeSinceResolution.

### Action Items
- [ ] Add circuit breaker to :::service.name database connections
- [ ] Increase :::metrics.cpuNormal CPU allocation in :::service.environment
- [ ] Update runbook for :::incident.detectedBy alert
`,
};

// ─── Mock Context Data ───────────────────────────────────────────────────────

const mockIncidentData = {
  incident: {
    id: 'INC-2024-1847',
    severity: 'SEV-2',
    status: 'Resolved',
    duration: '47 minutes',
    startTime: '14:23 UTC',
    endTime: '15:10 UTC',
    acknowledgedTime: '14:26 UTC',
    mitigatedTime: '14:52 UTC',
    detectedBy: 'Datadog P99 latency alert',
    rootCause: 'Database connection pool exhaustion caused by a query regression in the v2.14.3 deployment. A missing index on the `orders.created_at` column led to full table scans under peak traffic.',
    mitigation: 'rolled back to v2.14.2',
  },
  service: {
    name: 'order-service',
    environment: 'production-us-east-1',
  },
  impact: {
    usersAffected: '~12,400',
    failedRequests: '34,218',
    errorRatePeak: '23.4%',
    revenueImpact: '~$18,500',
  },
  metrics: {
    cpuPeak: '94%',
    cpuNormal: '35-45%',
    memoryPeak: '87%',
    memoryNormal: '55-65%',
    latencyPeak: '4,200ms',
    latencyNormal: '120-180ms',
    rps: '2,847/s',
    rpsNormal: '1,800-2,200/s',
    currentErrorRate: '0.02%',
    uptimeSinceResolution: '6h 23m',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function IncidentReportDemo() {
  const [content, setContent] = useState(incidentConfig.defaultContent ?? '');
  const categories = useMemo(() => buildCategories(mockIncidentData), []);
  const replacer = useMemo(() => buildReplacer(mockIncidentData), []);

  return (
    <TradingCommentary
      config={incidentConfig}
      value={content}
      onChange={setContent}
      replacer={replacer}
      categories={categories}
    />
  );
}
