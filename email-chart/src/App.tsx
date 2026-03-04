import { useState, useEffect, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Chip,
  Tabs,
  Tab,
  Paper,
  Button,
  Collapse,
  CircularProgress,
  alpha,
} from '@mui/material';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { AgCharts } from 'ag-charts-react';
import type { AgChartOptions } from 'ag-charts-community';

import { lineChartOptions, lineChartData } from './demo/LineChartDemo';
import { barChartOptions, barChartData } from './demo/BarChartDemo';
import { pieDonutOptions, pieDonutData } from './demo/PieDonutDemo';
import { scatterChartOptions, scatterChartData } from './demo/CandlestickDemo';
import { areaChartOptions, areaChartData } from './demo/AreaChartDemo';

// ─── Tab Data ────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Line Chart', options: lineChartOptions, data: lineChartData },
  { label: 'Bar Chart', options: barChartOptions, data: barChartData },
  { label: 'Pie / Donut', options: pieDonutOptions, data: pieDonutData },
  { label: 'Bubble Chart', options: scatterChartOptions, data: scatterChartData },
  { label: 'Stacked Area', options: areaChartOptions, data: areaChartData },
];

const RENDER_SERVER = 'http://localhost:3002';

// ─── Comparison Panel ────────────────────────────────────────────────────────

function ComparisonPanel({
  options,
  data,
}: {
  options: Record<string, unknown>;
  data: Record<string, unknown>[];
}) {
  const [showDataUrl, setShowDataUrl] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ssrImage, setSsrImage] = useState<string | null>(null);
  const [ssrTime, setSsrTime] = useState<number | null>(null);
  const [ssrError, setSsrError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSsrImage = useCallback(async () => {
    setLoading(true);
    setSsrError(null);
    try {
      const res = await fetch(`${RENDER_SERVER}/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartOptions: { ...options, data },
          width: 600,
          height: 350,
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const result = await res.json();
      setSsrImage(result.dataUrl);
      setSsrTime(result.renderTimeMs);
    } catch (err) {
      setSsrError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [options, data]);

  useEffect(() => {
    fetchSsrImage();
  }, [fetchSsrImage]);

  const handleCopy = async () => {
    if (ssrImage) {
      await navigator.clipboard.writeText(ssrImage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Build ag-Charts options for the live panel
  const liveOptions: AgChartOptions = {
    ...options,
    data,
    animation: { enabled: true },
  } as AgChartOptions;

  return (
    <Box>
      {/* Side-by-Side Comparison */}
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
        {/* Live ag-Charts Panel */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            fontWeight={600}
            sx={{
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.65rem',
              color: 'primary.main',
              mb: 1,
              display: 'block',
            }}
          >
            ag-Charts (Interactive)
          </Typography>
          <Paper elevation={0} sx={{ overflow: 'hidden', height: 400, p: 1 }}>
            <AgCharts options={liveOptions} />
          </Paper>
        </Box>

        {/* Server-Rendered PNG Panel */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            fontWeight={600}
            sx={{
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.65rem',
              color: 'primary.main',
              mb: 1,
              display: 'block',
            }}
          >
            Server-Rendered PNG (Email-Safe)
            {ssrTime !== null && (
              <Chip
                label={`${ssrTime}ms`}
                size="small"
                variant="outlined"
                color="success"
                sx={{ ml: 1, height: 18, fontSize: '0.6rem' }}
              />
            )}
          </Typography>
          <Paper
            elevation={0}
            sx={{
              overflow: 'hidden',
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#ffffff',
            }}
          >
            {loading && <CircularProgress size={32} />}
            {ssrError && (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Typography color="error" variant="body2" fontWeight={600}>
                  Render server unavailable
                </Typography>
                <Typography color="text.secondary" variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  Start it with: <code>npm run server</code> (port 3002)
                </Typography>
                <Button size="small" onClick={fetchSsrImage} sx={{ mt: 1 }}>
                  Retry
                </Button>
              </Box>
            )}
            {ssrImage && !loading && (
              <img
                src={ssrImage}
                alt="Server-rendered chart"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            )}
          </Paper>
        </Box>
      </Box>

      {/* Raw Data URL Output */}
      <Box sx={{ mt: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Button
            size="small"
            startIcon={showDataUrl ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowDataUrl((v) => !v)}
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <CodeIcon sx={{ fontSize: 14, mr: 0.5 }} />
            Raw Data URL
          </Button>
          {showDataUrl && ssrImage && (
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopy}
              variant={copied ? 'contained' : 'outlined'}
              color={copied ? 'success' : 'primary'}
            >
              {copied ? 'Copied!' : 'Copy Data URL'}
            </Button>
          )}
        </Box>
        <Collapse in={showDataUrl}>
          <Paper elevation={0} sx={{ overflow: 'hidden' }}>
            <Box
              component="pre"
              sx={{
                p: 2,
                maxHeight: 200,
                overflow: 'auto',
                fontSize: '0.6rem',
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                bgcolor: '#0f1419',
                color: '#8899aa',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                m: 0,
                borderTop: 1,
                borderColor: (t) => alpha(t.palette.primary.main, 0.1),
              }}
            >
              {ssrImage ?? 'No image rendered yet'}
            </Box>
          </Paper>
        </Collapse>
      </Box>
    </Box>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState(0);
  const current = TABS[tab];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <InsertChartIcon sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Email Chart
          </Typography>
          <Chip label="Demo" size="small" color="primary" variant="outlined" />
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="xl">
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '0.8rem',
                minHeight: 40,
              },
            }}
          >
            {TABS.map((t) => (
              <Tab key={t.label} label={t.label} />
            ))}
          </Tabs>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: 3, mb: 4, flex: 1 }}>
        <ComparisonPanel
          key={tab}
          options={current.options}
          data={current.data}
        />
      </Container>
    </Box>
  );
}
