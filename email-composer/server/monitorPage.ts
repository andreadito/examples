/**
 * Multi-job pipeline monitoring dashboard.
 * Shows all active/recent jobs in a list, with per-job detail views.
 * All CSS and JS are inline — no external dependencies needed.
 */
export function buildMonitorPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Composer — Pipeline Monitor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #0a0e14;
      color: #c8d0da;
      min-height: 100vh;
    }

    /* ── Header ────────────────────────────────────── */
    .header {
      background: linear-gradient(135deg, #0f1923 0%, #162030 100%);
      border-bottom: 1px solid #1e2a3a;
      padding: 20px 32px;
      text-align: center;
    }
    .header h1 { font-size: 1.4rem; color: #e8edf3; font-weight: 700; letter-spacing: -0.02em; }
    .header p { color: #6b7a8d; font-size: 0.85rem; margin-top: 4px; }

    /* ── Presets ───────────────────────────────────── */
    .presets {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
      padding: 20px 32px 8px;
    }
    .preset-btn {
      background: #131920;
      color: #8ba3bd;
      border: 1px solid #1e2a3a;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .preset-btn:hover { background: #1a2430; border-color: #2563eb; color: #bac8d8; }
    .preset-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .preset-btn.fire-all {
      background: #2a1508;
      border-color: #f97316;
      color: #fb923c;
    }
    .preset-btn.fire-all:hover { background: #3a1a08; border-color: #fb923c; color: #fdba74; }

    /* ── Main layout ──────────────────────────────── */
    .main { max-width: 1000px; margin: 0 auto; padding: 16px 24px 48px; }

    /* ── Job list ─────────────────────────────────── */
    .job-list-section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: #6b7a8d;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
    }
    .job-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
      background: #0d1117;
      border: 1px solid #1e2a3a;
      border-radius: 8px;
      overflow: hidden;
    }
    .job-table th {
      text-align: left;
      padding: 10px 12px;
      color: #6b7a8d;
      font-weight: 600;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #0f1620;
      border-bottom: 1px solid #1e2a3a;
    }
    .job-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #111820;
      color: #8ba3bd;
    }
    .job-table tr:last-child td { border-bottom: none; }
    .job-table tr.job-row { cursor: pointer; transition: background 0.15s; }
    .job-table tr.job-row:hover { background: #131920; }
    .job-table tr.job-row.selected { background: #162040; }
    .job-table tr.job-row.selected td { color: #bac8d8; }
    .job-empty {
      text-align: center;
      padding: 20px;
      color: #3a4a5c;
      font-size: 0.85rem;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .status-badge.running { background: #162040; color: #60a5fa; }
    .status-badge.done { background: #0d2818; color: #4ade80; }
    .status-badge.error { background: #2a0d0d; color: #f87171; }

    /* ── Detail panel ─────────────────────────────── */
    .detail-panel {
      border-top: 2px solid #1e2a3a;
      padding-top: 16px;
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .detail-header h2 {
      font-size: 1rem;
      color: #e8edf3;
      font-weight: 600;
    }
    .detail-header .tag {
      display: inline-block;
      background: #1a2030;
      color: #8ba3bd;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.72rem;
      margin-left: 8px;
    }

    /* ── Phase bar ────────────────────────────────── */
    .phases {
      display: flex;
      gap: 0;
      margin: 12px 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #1e2a3a;
      background: #0d1117;
    }
    .phase {
      flex: 1;
      text-align: center;
      padding: 12px 8px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #3a4a5c;
      background: #0d1117;
      border-right: 1px solid #1e2a3a;
      transition: all 0.3s;
    }
    .phase:last-child { border-right: none; }
    .phase .timing { display: block; font-weight: 400; font-size: 0.7rem; margin-top: 2px; color: #4a5a6c; }
    .phase.active { background: #111d2e; color: #60a5fa; }
    .phase.active .timing { color: #4888c8; }
    .phase.done { background: #0d1f14; color: #4ade80; }
    .phase.done .timing { color: #38a868; }
    .phase.error { background: #1f0d0d; color: #f87171; }

    /* ── Blocks grid ──────────────────────────────── */
    .blocks-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: #6b7a8d;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 20px 0 10px;
    }
    .blocks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 10px;
    }
    .block-card {
      background: #131920;
      border: 1px solid #1e2a3a;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: border-color 0.3s;
    }
    .block-card.fetching, .block-card.rendering { border-color: #2563eb; }
    .block-card.done { border-color: #22c55e; }
    .block-card.error { border-color: #ef4444; }
    .block-card.stuck { border-color: #eab308; }

    .status-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      flex-shrink: 0;
      background: #1a2030;
      color: #3a4a5c;
    }
    .status-dot.skip { background: #1a2030; color: #4a5a6c; }
    .status-dot.fetching, .status-dot.rendering {
      background: #162040;
      color: #60a5fa;
      animation: pulse 1s ease-in-out infinite;
    }
    .status-dot.done { background: #0d2818; color: #4ade80; }
    .status-dot.error { background: #2a0d0d; color: #f87171; }
    .status-dot.stuck { background: #2a2400; color: #eab308; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .block-info { flex: 1; min-width: 0; }
    .block-info .label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #bac8d8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .block-info .meta {
      font-size: 0.72rem;
      color: #4a5a6c;
      margin-top: 2px;
    }
    .block-info .meta .tag {
      display: inline-block;
      background: #1a2030;
      padding: 1px 6px;
      border-radius: 3px;
      margin-right: 4px;
    }
    .block-info .error-msg {
      font-size: 0.72rem;
      color: #f87171;
      margin-top: 3px;
      word-break: break-word;
    }
    .block-timing {
      font-size: 0.78rem;
      font-weight: 600;
      color: #4a5a6c;
      flex-shrink: 0;
      min-width: 50px;
      text-align: right;
    }
    .block-timing.has-time { color: #6b8aad; }

    /* ── Timing summary ───────────────────────────── */
    .summary {
      background: #131920;
      border: 1px solid #1e2a3a;
      border-radius: 8px;
      padding: 16px 20px;
      margin-top: 16px;
      display: none;
    }
    .summary.visible { display: block; }
    .summary h3 {
      font-size: 0.8rem;
      color: #6b7a8d;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 0.82rem;
      border-bottom: 1px solid #111820;
    }
    .summary-row:last-child { border-bottom: none; }
    .summary-row .val { color: #60a5fa; font-weight: 600; }
    .summary-row.total .val { color: #4ade80; font-size: 0.9rem; }

    /* ── Warning / Error ──────────────────────────── */
    .warning {
      background: #2a2400;
      border: 1px solid #eab308;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 0.82rem;
      color: #eab308;
      margin-top: 12px;
      display: none;
    }
    .warning.visible { display: block; }
    .error-banner {
      background: #1f0d0d;
      border: 1px solid #ef4444;
      border-radius: 8px;
      padding: 12px 16px;
      color: #f87171;
      font-size: 0.85rem;
      margin-top: 12px;
      display: none;
    }
    .error-banner.visible { display: block; }

    /* ── Email preview ────────────────────────────── */
    .preview-section {
      margin-top: 24px;
      display: none;
    }
    .preview-section.visible { display: block; }
    .preview-section h3 {
      font-size: 0.8rem;
      color: #6b7a8d;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
    }
    .preview-frame {
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #1e2a3a;
    }
    .preview-frame iframe {
      width: 100%;
      min-height: 700px;
      border: none;
      display: block;
    }

    /* ── Idle state ────────────────────────────────── */
    .idle-msg {
      text-align: center;
      color: #3a4a5c;
      padding: 40px 20px;
      font-size: 0.9rem;
    }
    .idle-msg .icon { font-size: 2rem; margin-bottom: 8px; }

    /* ── Custom JSON panel ─────────────────────────── */
    .custom-panel {
      display: none;
      margin-bottom: 16px;
    }
    .custom-panel textarea {
      width: 100%;
      background: #131920;
      color: #c8d0da;
      border: 1px solid #1e2a3a;
      border-radius: 6px;
      padding: 10px;
      font-family: monospace;
      font-size: 0.8rem;
      resize: vertical;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Email Composer — Pipeline Monitor</h1>
    <p>Real-time multi-job dashboard — data resolution, rendering, and assembly</p>
  </div>

  <div class="presets">
    <button class="preset-btn" onclick="runPreset('full')">Inline Data</button>
    <button class="preset-btn" onclick="runPreset('datasource')">HTTP + WS</button>
    <button class="preset-btn" onclick="runPreset('static')">Static Only</button>
    <button class="preset-btn" onclick="runPreset('heavy')">Heavy Load</button>
    <button class="preset-btn" onclick="runPreset('errors')">Errors</button>
    <button class="preset-btn" onclick="runPreset('slow')">Slow Sources</button>
    <button class="preset-btn fire-all" onclick="fireAll()">Fire All</button>
    <button class="preset-btn" id="customBtn" onclick="toggleCustom()">Custom...</button>
  </div>

  <div class="main">
    <!-- Custom JSON input -->
    <div class="custom-panel" id="customPanel">
      <textarea id="customJson" rows="5"
        placeholder='{ "blocks": [...], "template": {...} }'></textarea>
      <button class="preset-btn" onclick="runCustom()" style="margin-top:8px;">Run Custom Pipeline</button>
    </div>

    <!-- Job list -->
    <div class="job-list-section">
      <div class="section-title">Jobs</div>
      <table class="job-table">
        <thead>
          <tr>
            <th style="width:70px">Job ID</th>
            <th style="width:100px">Preset</th>
            <th style="width:60px">Blocks</th>
            <th style="width:80px">Status</th>
            <th style="width:80px">Time</th>
            <th style="width:90px">Started</th>
          </tr>
        </thead>
        <tbody id="jobTableBody">
          <tr><td colspan="6" class="job-empty">No jobs yet — select a preset above</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Detail panel (shows selected job) -->
    <div id="detailPanel" style="display:none;" class="detail-panel">
      <div class="detail-header">
        <h2 id="detailTitle">Job —</h2>
      </div>

      <!-- Phase progress bar -->
      <div class="phases">
        <div class="phase" id="phase-resolve">Resolve<span class="timing" id="phase-resolve-time"></span></div>
        <div class="phase" id="phase-render">Render<span class="timing" id="phase-render-time"></span></div>
        <div class="phase" id="phase-assemble">Assemble<span class="timing" id="phase-assemble-time"></span></div>
      </div>

      <!-- Resolve blocks -->
      <div class="blocks-title">Phase 1 — Data Resolution</div>
      <div class="blocks-grid" id="resolve-grid"></div>

      <!-- Render blocks -->
      <div class="blocks-title" style="margin-top:20px;">Phase 2 — Block Rendering</div>
      <div class="blocks-grid" id="render-grid"></div>

      <!-- Warning -->
      <div class="warning" id="warning"></div>
      <!-- Error -->
      <div class="error-banner" id="errorBanner"></div>

      <!-- Timing summary -->
      <div class="summary" id="summary">
        <h3>Timing Summary</h3>
        <div id="summaryRows"></div>
      </div>

      <!-- Email preview -->
      <div class="preview-section" id="preview">
        <h3>Composed Email Preview</h3>
        <div class="preview-frame">
          <iframe id="previewFrame" sandbox="allow-same-origin"></iframe>
        </div>
      </div>
    </div>
  </div>

  <script>
    // ── State ────────────────────────────────────────────────────────────────

    /** @type {Map<string, Object>} jobId -> { id, status, preset, totalBlocks, startedAt, events[], resolveTimeMs, renderTimeMs, assemblyStart, totalTimeMs, html, error, blockStartTimes } */
    const allJobs = new Map();
    let selectedJobId = null;
    let globalSSE = null;
    let detailSSE = null; // per-job SSE used when selecting a completed job
    let stuckTimer = null;
    let timestampTimer = null;

    const STUCK_THRESHOLD_MS = 15000;
    const PRESET_LABELS = {
      full: 'Inline Data',
      datasource: 'HTTP + WS',
      static: 'Static Only',
      heavy: 'Heavy Load',
      errors: 'Errors',
      slow: 'Slow Sources',
      custom: 'Custom',
    };

    // ── Init ─────────────────────────────────────────────────────────────────

    async function init() {
      // 1. Fetch existing jobs
      try {
        const res = await fetch('/api/pipeline/jobs');
        const jobs = await res.json();
        for (const j of jobs) {
          allJobs.set(j.id, {
            ...j,
            events: [],
            resolveTimeMs: 0,
            renderTimeMs: 0,
            assemblyStart: 0,
            totalTimeMs: j.totalTimeMs || 0,
            html: null,
            blockStartTimes: {},
          });
        }
        renderJobList();
      } catch (e) { /* no jobs yet */ }

      // 2. Open global SSE
      connectGlobalSSE();

      // 3. Start relative timestamp ticker
      timestampTimer = setInterval(updateTimestamps, 1000);

      // 4. Start stuck detection
      stuckTimer = setInterval(checkStuck, 2000);
    }

    function connectGlobalSSE() {
      if (globalSSE) globalSSE.close();
      globalSSE = new EventSource('/api/pipeline/events');

      const eventTypes = [
        'pipeline:start', 'resolve:start', 'resolve:block', 'resolve:complete',
        'render:start', 'render:block', 'render:complete',
        'assembly:start', 'assembly:complete', 'pipeline:done', 'pipeline:error'
      ];
      eventTypes.forEach(type => {
        globalSSE.addEventListener(type, (e) => {
          const ev = JSON.parse(e.data);
          handleGlobalEvent(type, ev);
        });
      });

      globalSSE.onerror = () => {
        // Reconnect after a brief delay
        setTimeout(connectGlobalSSE, 2000);
      };
    }

    // ── Global event handler ─────────────────────────────────────────────────

    function handleGlobalEvent(type, ev) {
      const jobId = ev.jobId;
      if (!jobId) return;

      // Ensure job exists in our map
      if (!allJobs.has(jobId)) {
        allJobs.set(jobId, {
          id: jobId,
          status: 'running',
          preset: ev.data?.preset || '?',
          totalBlocks: ev.data?.totalBlocks || 0,
          startedAt: Date.now(),
          events: [],
          resolveTimeMs: 0,
          renderTimeMs: 0,
          assemblyStart: 0,
          totalTimeMs: 0,
          html: null,
          error: null,
          blockStartTimes: {},
        });
      }

      const job = allJobs.get(jobId);
      job.events.push({ type, ev });

      // Update job state based on event
      switch (type) {
        case 'pipeline:start':
          job.totalBlocks = ev.data?.totalBlocks || job.totalBlocks;
          if (ev.data?.preset) job.preset = ev.data.preset;
          break;
        case 'resolve:complete':
          job.resolveTimeMs = ev.data?.resolveTimeMs || 0;
          break;
        case 'render:complete':
          job.renderTimeMs = ev.data?.renderTimeMs || 0;
          break;
        case 'pipeline:done':
          job.status = 'done';
          job.totalTimeMs = ev.data?.totalTimeMs || 0;
          job.html = ev.data?.html || null;
          break;
        case 'pipeline:error':
          job.status = 'error';
          job.error = ev.data?.error || 'Unknown error';
          break;
      }

      renderJobList();

      // If this is a new job and nothing is selected, auto-select it
      if (type === 'pipeline:start' && !selectedJobId) {
        selectJob(jobId);
      }
      // If this is a new job and user was looking at something already, still auto-select new
      else if (type === 'pipeline:start') {
        selectJob(jobId);
      }

      // If this job is currently selected, update the detail view
      if (jobId === selectedJobId) {
        applyEventToDetail(type, ev);
      }
    }

    // ── Preset runners ───────────────────────────────────────────────────────

    async function runPreset(name) {
      try {
        const res = await fetch('/api/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preset: name }),
        });
        const { jobId, error } = await res.json();
        if (error) throw new Error(error);
        // Global SSE will pick up the events
      } catch (err) {
        alert('Failed to start pipeline: ' + err.message);
      }
    }

    async function fireAll() {
      const presets = ['datasource', 'heavy', 'errors', 'slow'];
      await Promise.all(presets.map(p =>
        fetch('/api/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preset: p }),
        })
      ));
    }

    function toggleCustom() {
      const panel = document.getElementById('customPanel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    async function runCustom() {
      const raw = document.getElementById('customJson').value.trim();
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        const res = await fetch('/api/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });
        const { jobId, error } = await res.json();
        if (error) throw new Error(error);
      } catch (e) {
        alert('Error: ' + e.message);
      }
    }

    // ── Job list rendering ───────────────────────────────────────────────────

    function renderJobList() {
      const tbody = document.getElementById('jobTableBody');
      const jobs = Array.from(allJobs.values()).sort((a, b) => b.startedAt - a.startedAt);

      if (jobs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="job-empty">No jobs yet — select a preset above</td></tr>';
        return;
      }

      tbody.innerHTML = jobs.map(j => {
        const selected = j.id === selectedJobId ? ' selected' : '';
        const statusClass = j.status;
        const statusIcon = j.status === 'running' ? '&#9679;' : j.status === 'done' ? '&#10003;' : '&#10007;';
        const statusLabel = j.status === 'running' ? 'Running' : j.status === 'done' ? 'Done' : 'Error';
        const timeStr = j.status === 'done' ? j.totalTimeMs + 'ms' : j.status === 'error' ? '—' : '...';
        const presetLabel = PRESET_LABELS[j.preset] || j.preset || '—';
        return '<tr class="job-row' + selected + '" onclick="selectJob(\\'' + j.id + '\\')">' +
          '<td><code>' + j.id + '</code></td>' +
          '<td>' + presetLabel + '</td>' +
          '<td>' + j.totalBlocks + '</td>' +
          '<td><span class="status-badge ' + statusClass + '">' + statusIcon + ' ' + statusLabel + '</span></td>' +
          '<td>' + timeStr + '</td>' +
          '<td class="timestamp" data-start="' + j.startedAt + '">' + relativeTime(j.startedAt) + '</td>' +
        '</tr>';
      }).join('');
    }

    function relativeTime(ts) {
      const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      if (diff < 5) return 'just now';
      if (diff < 60) return diff + 's ago';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      return Math.floor(diff / 3600) + 'h ago';
    }

    function updateTimestamps() {
      document.querySelectorAll('.timestamp[data-start]').forEach(el => {
        el.textContent = relativeTime(parseInt(el.dataset.start));
      });
    }

    // ── Job selection ────────────────────────────────────────────────────────

    function selectJob(jobId) {
      selectedJobId = jobId;
      renderJobList(); // re-highlight

      // Close any existing detail SSE
      if (detailSSE) { detailSSE.close(); detailSSE = null; }

      // Reset detail panel
      resetDetailPanel();

      const job = allJobs.get(jobId);
      if (!job) return;

      const presetLabel = PRESET_LABELS[job.preset] || job.preset || 'Unknown';
      document.getElementById('detailTitle').innerHTML =
        'Job <code>' + job.id + '</code><span class="tag">' + presetLabel + '</span>';
      document.getElementById('detailPanel').style.display = 'block';

      // Open per-job SSE — it replays all stored events, giving us the full picture
      detailSSE = new EventSource('/api/pipeline/' + jobId + '/events');

      const eventTypes = [
        'pipeline:start', 'resolve:start', 'resolve:block', 'resolve:complete',
        'render:start', 'render:block', 'render:complete',
        'assembly:start', 'assembly:complete', 'pipeline:done', 'pipeline:error'
      ];
      eventTypes.forEach(type => {
        detailSSE.addEventListener(type, (e) => {
          const ev = JSON.parse(e.data);
          // Only apply if this job is still selected
          if (selectedJobId === jobId) {
            applyEventToDetail(type, ev);
          }
        });
      });

      detailSSE.onerror = () => {
        detailSSE.close();
        detailSSE = null;
      };
    }

    function resetDetailPanel() {
      document.getElementById('resolve-grid').innerHTML = '';
      document.getElementById('render-grid').innerHTML = '';
      document.getElementById('summary').classList.remove('visible');
      document.getElementById('preview').classList.remove('visible');
      document.getElementById('warning').classList.remove('visible');
      document.getElementById('errorBanner').classList.remove('visible');

      ['resolve', 'render', 'assemble'].forEach(p => {
        const el = document.getElementById('phase-' + p);
        el.className = 'phase';
        document.getElementById('phase-' + p + '-time').textContent = '';
      });

      detailState = {
        totalBlocks: 0,
        resolveTimeMs: 0,
        renderTimeMs: 0,
        assemblyStart: 0,
        blockStartTimes: {},
      };
    }

    // ── Detail state ─────────────────────────────────────────────────────────

    let detailState = {
      totalBlocks: 0,
      resolveTimeMs: 0,
      renderTimeMs: 0,
      assemblyStart: 0,
      blockStartTimes: {},
    };

    function applyEventToDetail(type, ev) {
      const data = ev.data || {};

      switch (type) {
        case 'pipeline:start':
          detailState.totalBlocks = data.totalBlocks || 0;
          initBlockCards(detailState.totalBlocks);
          break;

        case 'resolve:start':
          setPhase('resolve', 'active');
          break;

        case 'resolve:block':
          updateResolveBlock(data);
          break;

        case 'resolve:complete':
          detailState.resolveTimeMs = data.resolveTimeMs || 0;
          setPhase('resolve', 'done', detailState.resolveTimeMs + 'ms');
          break;

        case 'render:start':
          setPhase('render', 'active');
          break;

        case 'render:block':
          updateRenderBlock(data);
          break;

        case 'render:complete':
          detailState.renderTimeMs = data.renderTimeMs || 0;
          setPhase('render', 'done', detailState.renderTimeMs + 'ms');
          break;

        case 'assembly:start':
          detailState.assemblyStart = Date.now();
          setPhase('assemble', 'active');
          break;

        case 'assembly:complete':
          setPhase('assemble', 'done', (Date.now() - detailState.assemblyStart) + 'ms');
          break;

        case 'pipeline:done':
          showDetailDone(data);
          break;

        case 'pipeline:error':
          showDetailError(data.error || 'Unknown error');
          break;
      }
    }

    // ── Phase bar ────────────────────────────────────────────────────────────

    function setPhase(name, state, timing) {
      const el = document.getElementById('phase-' + name);
      el.className = 'phase ' + state;
      if (timing) {
        document.getElementById('phase-' + name + '-time').textContent = timing;
      }
    }

    // ── Block cards ──────────────────────────────────────────────────────────

    function initBlockCards(count) {
      const resolveGrid = document.getElementById('resolve-grid');
      const renderGrid = document.getElementById('render-grid');
      resolveGrid.innerHTML = '';
      renderGrid.innerHTML = '';

      for (let i = 0; i < count; i++) {
        resolveGrid.appendChild(makeCard('resolve', i));
        renderGrid.appendChild(makeCard('render', i));
      }
    }

    function makeCard(phase, idx) {
      const card = document.createElement('div');
      card.className = 'block-card';
      card.id = phase + '-block-' + idx;
      card.innerHTML =
        '<div class="status-dot" id="' + phase + '-dot-' + idx + '">&#9208;</div>' +
        '<div class="block-info">' +
          '<div class="label" id="' + phase + '-label-' + idx + '">Block ' + idx + '</div>' +
          '<div class="meta" id="' + phase + '-meta-' + idx + '"></div>' +
          '<div class="error-msg" id="' + phase + '-err-' + idx + '"></div>' +
        '</div>' +
        '<div class="block-timing" id="' + phase + '-time-' + idx + '"></div>';
      return card;
    }

    function updateResolveBlock(data) {
      const i = data.blockIndex;
      const card = document.getElementById('resolve-block-' + i);
      const dot = document.getElementById('resolve-dot-' + i);
      const label = document.getElementById('resolve-label-' + i);
      const meta = document.getElementById('resolve-meta-' + i);
      const errEl = document.getElementById('resolve-err-' + i);
      const timeEl = document.getElementById('resolve-time-' + i);
      if (!card) return;

      const blockType = data.blockType || 'unknown';
      label.textContent = '#' + i + ' ' + blockType;

      switch (data.status) {
        case 'skip':
          card.className = 'block-card';
          dot.className = 'status-dot skip';
          dot.textContent = '\\u2014';
          meta.innerHTML = '<span class="tag">no data source</span>';
          timeEl.textContent = 'skip';
          break;
        case 'fetching':
          card.className = 'block-card fetching';
          dot.className = 'status-dot fetching';
          dot.textContent = '\\u21BB';
          meta.innerHTML = '<span class="tag">' + (data.dataSourceKind || 'fetch') + '</span>';
          detailState.blockStartTimes['resolve-' + i] = Date.now();
          break;
        case 'done':
          card.className = 'block-card done';
          dot.className = 'status-dot done';
          dot.textContent = '\\u2713';
          timeEl.textContent = (data.resolveTimeMs || 0) + 'ms';
          timeEl.className = 'block-timing has-time';
          delete detailState.blockStartTimes['resolve-' + i];
          break;
        case 'error':
          card.className = 'block-card error';
          dot.className = 'status-dot error';
          dot.textContent = '\\u2717';
          errEl.textContent = data.error || 'Failed';
          delete detailState.blockStartTimes['resolve-' + i];
          break;
      }
    }

    function updateRenderBlock(data) {
      const i = data.blockIndex;
      const card = document.getElementById('render-block-' + i);
      const dot = document.getElementById('render-dot-' + i);
      const label = document.getElementById('render-label-' + i);
      const meta = document.getElementById('render-meta-' + i);
      const errEl = document.getElementById('render-err-' + i);
      const timeEl = document.getElementById('render-time-' + i);
      if (!card) return;

      const blockType = data.blockType || 'unknown';
      label.textContent = '#' + i + ' ' + blockType;

      switch (data.status) {
        case 'rendering':
          card.className = 'block-card rendering';
          dot.className = 'status-dot rendering';
          dot.textContent = '\\u21BB';
          meta.innerHTML = '<span class="tag">' + blockType + '</span>';
          detailState.blockStartTimes['render-' + i] = Date.now();
          break;
        case 'done':
          card.className = 'block-card done';
          dot.className = 'status-dot done';
          dot.textContent = '\\u2713';
          timeEl.textContent = (data.renderTimeMs || 0) + 'ms';
          timeEl.className = 'block-timing has-time';
          delete detailState.blockStartTimes['render-' + i];
          break;
        case 'error':
          card.className = 'block-card error';
          dot.className = 'status-dot error';
          dot.textContent = '\\u2717';
          errEl.textContent = data.error || 'Failed';
          delete detailState.blockStartTimes['render-' + i];
          break;
      }
    }

    // ── Stuck detection ──────────────────────────────────────────────────────

    function checkStuck() {
      if (!selectedJobId) return;
      const now = Date.now();
      let hasStuck = false;

      for (const [key, startTime] of Object.entries(detailState.blockStartTimes)) {
        if (now - startTime > STUCK_THRESHOLD_MS) {
          hasStuck = true;
          const parts = key.split('-');
          const phase = parts[0];
          const idx = parts[1];
          const card = document.getElementById(phase + '-block-' + idx);
          const dot = document.getElementById(phase + '-dot-' + idx);
          if (card) card.className = 'block-card stuck';
          if (dot) { dot.className = 'status-dot stuck'; dot.textContent = '\\u26A0'; }
        }
      }

      const warning = document.getElementById('warning');
      if (hasStuck) {
        warning.textContent = '\\u26A0 Some blocks have been in progress for over 15 seconds.';
        warning.classList.add('visible');
      } else {
        warning.classList.remove('visible');
      }
    }

    // ── Done / Error ─────────────────────────────────────────────────────────

    function showDetailDone(data) {
      if (detailSSE) { detailSSE.close(); detailSSE = null; }

      const totalTimeMs = data.totalTimeMs || 0;

      // Timing summary
      const summaryEl = document.getElementById('summary');
      const rows = document.getElementById('summaryRows');
      rows.innerHTML =
        summaryRow('Total Pipeline', totalTimeMs + 'ms', true) +
        summaryRow('Data Resolution', detailState.resolveTimeMs + 'ms') +
        summaryRow('Block Rendering', detailState.renderTimeMs + 'ms') +
        summaryRow('Assembly', Math.max(0, totalTimeMs - detailState.resolveTimeMs - detailState.renderTimeMs) + 'ms');
      summaryEl.classList.add('visible');

      // Email preview
      if (data.html) {
        const preview = document.getElementById('preview');
        const frame = document.getElementById('previewFrame');
        frame.srcdoc = data.html;
        preview.classList.add('visible');
      }

      // Update job in the list
      renderJobList();
    }

    function summaryRow(label, value, isTotal) {
      return '<div class="summary-row' + (isTotal ? ' total' : '') + '">' +
        '<span>' + label + '</span><span class="val">' + value + '</span></div>';
    }

    function showDetailError(msg) {
      if (detailSSE) { detailSSE.close(); detailSSE = null; }

      const banner = document.getElementById('errorBanner');
      banner.textContent = '\\u274C Pipeline error: ' + msg;
      banner.classList.add('visible');

      setPhase('resolve', 'error');
      setPhase('render', 'error');
      setPhase('assemble', 'error');

      renderJobList();
    }

    // ── Start ────────────────────────────────────────────────────────────────
    init();
  </script>
</body>
</html>`;
}
