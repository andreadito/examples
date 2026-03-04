import { useState, useMemo } from 'react';
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
  alpha,
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef as AgColDef } from 'ag-grid-community';
import { EmailTable } from './engine/EmailTable';
import { renderToHtml } from './engine/renderToHtml';
import type { ColDef } from './types';

import { tradeBlotterColDefs, tradeBlotterData } from './demo/TradeBlotterDemo';
import { portfolioColDefs, portfolioData } from './demo/PortfolioHoldingsDemo';
import { riskColDefs, riskData } from './demo/RiskSummaryDemo';
import { employeeColDefs, employeeData } from './demo/EmployeeDirectoryDemo';

ModuleRegistry.registerModules([AllCommunityModule]);

// ─── Tab Data ────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Trade Blotter', colDefs: tradeBlotterColDefs, rowData: tradeBlotterData },
  { label: 'Portfolio Holdings', colDefs: portfolioColDefs, rowData: portfolioData },
  { label: 'Risk Summary', colDefs: riskColDefs, rowData: riskData },
  { label: 'Employee Directory', colDefs: employeeColDefs, rowData: employeeData },
];

// ─── Comparison Panel ────────────────────────────────────────────────────────

function ComparisonPanel({
  colDefs,
  rowData,
}: {
  colDefs: ColDef[];
  rowData: Record<string, unknown>[];
}) {
  const [showHtml, setShowHtml] = useState(false);
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => renderToHtml(rowData, colDefs), [rowData, colDefs]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box>
      {/* Side-by-Side Comparison */}
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
        {/* ag-Grid Panel */}
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
            ag-Grid (Interactive)
          </Typography>
          <Paper elevation={0} sx={{ overflow: 'hidden', height: 380 }}>
            <div
              className="ag-theme-balham-dark"
              style={{ width: '100%', height: '100%' }}
            >
              <AgGridReact
                rowData={rowData}
                columnDefs={colDefs as AgColDef[]}
                defaultColDef={{ resizable: true, sortable: true }}
                domLayout="normal"
              />
            </div>
          </Paper>
        </Box>

        {/* Email Table Panel */}
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
            Email Table (Static HTML)
          </Typography>
          <Paper
            elevation={0}
            sx={{
              overflow: 'auto',
              height: 380,
              bgcolor: '#ffffff',
              '& table': { minWidth: 600 },
            }}
          >
            <EmailTable columnDefs={colDefs} rowData={rowData} />
          </Paper>
        </Box>
      </Box>

      {/* Raw HTML Output */}
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
            startIcon={showHtml ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowHtml((v) => !v)}
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <CodeIcon sx={{ fontSize: 14, mr: 0.5 }} />
            Raw HTML Output
          </Button>
          {showHtml && (
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopy}
              variant={copied ? 'contained' : 'outlined'}
              color={copied ? 'success' : 'primary'}
            >
              {copied ? 'Copied!' : 'Copy HTML'}
            </Button>
          )}
        </Box>
        <Collapse in={showHtml}>
          <Paper elevation={0} sx={{ overflow: 'hidden' }}>
            <Box
              component="pre"
              sx={{
                p: 2,
                maxHeight: 300,
                overflow: 'auto',
                fontSize: '0.7rem',
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
              {html}
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
          <TableChartIcon sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Email Table
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
          colDefs={current.colDefs}
          rowData={current.rowData}
        />
      </Container>
    </Box>
  );
}
