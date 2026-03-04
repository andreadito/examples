import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Collapse,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Send as SendIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

import { dailyReportBlocks, dailyReportTemplate } from './demo/DailyTradingReport';

interface BlockResult {
  type: string;
  index: number;
  renderTimeMs: number;
}

interface ComposeResponse {
  html: string;
  renderTimeMs: number;
  blockResults: BlockResult[];
}

const COMPOSE_URL = 'http://localhost:3003/api/compose';

export default function App() {
  const [result, setResult] = useState<ComposeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCompose = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(COMPOSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: dailyReportBlocks,
          template: dailyReportTemplate,
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: ComposeResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Email Composer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Compose tables + charts into a single email-safe HTML document
        </Typography>
      </Box>

      {/* Action Bar */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          onClick={handleCompose}
          disabled={loading}
        >
          {loading ? 'Composing…' : 'Compose Daily Trading Report'}
        </Button>

        {result && (
          <>
            <Chip
              label={`${result.renderTimeMs}ms total`}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              label={`${result.blockResults.length} blocks`}
              size="small"
              variant="outlined"
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button
              size="small"
              startIcon={copied ? <CheckIcon /> : <CopyIcon />}
              onClick={handleCopy}
              color={copied ? 'success' : 'primary'}
            >
              {copied ? 'Copied!' : 'Copy HTML'}
            </Button>
          </>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && (
        <>
          {/* Timing Breakdown */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2">Block Render Times</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Time (ms)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.blockResults.map((b) => (
                    <TableRow key={b.index}>
                      <TableCell>{b.index}</TableCell>
                      <TableCell>
                        <Chip label={b.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{b.renderTimeMs}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Email Preview */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2">Email Preview</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <iframe
                srcDoc={result.html}
                sandbox="allow-same-origin"
                style={{
                  width: '100%',
                  minHeight: 900,
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  background: '#fff',
                }}
                title="Email Preview"
              />
            </Box>
          </Paper>

          {/* Raw HTML */}
          <Paper>
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setShowHtml(!showHtml)}
            >
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                Raw HTML ({(result.html.length / 1024).toFixed(1)} KB)
              </Typography>
              <IconButton size="small">
                {showHtml ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            </Box>
            <Collapse in={showHtml}>
              <Box
                sx={{
                  p: 2,
                  pt: 0,
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                <pre
                  style={{
                    fontSize: 11,
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                    color: '#8899aa',
                  }}
                >
                  {result.html}
                </pre>
              </Box>
            </Collapse>
          </Paper>
        </>
      )}
    </Box>
  );
}
