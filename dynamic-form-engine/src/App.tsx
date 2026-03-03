import { useState, useCallback, useRef, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Tabs,
  Tab,
  Box,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  alpha,
} from "@mui/material";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import type { LogEntry } from "./types";
import { TradeEntryDemo } from "./demo/TradeEntryForm";
import { RiskParametersDemo } from "./demo/RiskParametersForm";
import { FxSpotForwardDemo } from "./demo/FxSpotForwardForm";
import { CreditDefaultSwapDemo } from "./demo/CreditDefaultSwapForm";
import { EquityOptionsDemo } from "./demo/EquityOptionsForm";
import { PatientIntakeDemo } from "./demo/PatientIntakeForm";

// ─── Activity Log ────────────────────────────────────────────────────────────

function ActivityLog({
  logs,
  onClear,
}: {
  logs: LogEntry[];
  onClear: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  const chipColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "success";
      case "error":
        return "error";
      case "warning":
        return "warning";
      default:
        return "info";
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 3,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          pb: 1,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          Activity Log
        </Typography>
        <Tooltip title="Clear log">
          <IconButton size="small" onClick={onClear}>
            <DeleteSweepIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        ref={scrollRef}
        sx={{
          px: 2,
          pb: 2,
          maxHeight: 240,
          overflowY: "auto",
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "0.75rem",
          lineHeight: 1.8,
        }}
      >
        {logs.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontStyle: "italic", py: 2, textAlign: "center" }}
          >
            No activity yet. Submit a form to see logs here.
          </Typography>
        )}
        {logs.map((log, idx) => (
          <Box
            key={idx}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              py: 0.5,
              borderBottom: "1px solid",
              borderColor: (t) => alpha(t.palette.divider, 0.5),
              "&:last-child": { borderBottom: "none" },
            }}
          >
            <Typography
              component="span"
              sx={{
                color: "text.secondary",
                fontSize: "0.7rem",
                whiteSpace: "nowrap",
                mt: "2px",
              }}
            >
              {log.timestamp.toLocaleTimeString()}
            </Typography>
            <Chip
              label={log.type.toUpperCase()}
              color={chipColor(log.type)}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.6rem",
                fontWeight: 700,
                minWidth: 56,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                component="span"
                sx={{ fontSize: "0.75rem", color: "text.primary" }}
              >
                {log.message}
              </Typography>
              {log.data && (
                <Typography
                  component="pre"
                  sx={{
                    fontSize: "0.7rem",
                    color: "text.secondary",
                    mt: 0.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    maxHeight: 100,
                    overflow: "auto",
                    m: 0,
                  }}
                >
                  {JSON.stringify(log.data, null, 2)}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

// ─── Tab Panel ───────────────────────────────────────────────────────────────

function TabPanel({
  children,
  value,
  index,
}: {
  children: React.ReactNode;
  value: number;
  index: number;
}) {
  if (value !== index) return null;
  return <Box sx={{ mt: 3 }}>{children}</Box>;
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev, entry]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* App Bar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <ShowChartIcon sx={{ mr: 1.5, color: "primary.main" }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Dynamic Form Engine
          </Typography>
          <Chip label="Demo" size="small" color="primary" variant="outlined" />
        </Toolbar>
      </AppBar>

      {/* Content — full width for trader screens */}
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4, flex: 1 }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              minWidth: "auto",
              px: 2,
            },
          }}
        >
          <Tab label="Trade Entry" />
          <Tab label="FX Spot/Forward" />
          <Tab label="Credit Default Swap" />
          <Tab label="Equity Options" />
          <Tab label="Risk Parameters" />
          <Tab label="Patient Intake" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <TradeEntryDemo
            onLog={addLog}
            initialValues={{
              side: "BUY",
              instrumentType: "equity",
              ticker: "AAPL",
              exchange: "NASDAQ",
              orderType: "LIMIT",
              quantity: 500,
            }}
          />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <FxSpotForwardDemo onLog={addLog} />
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <CreditDefaultSwapDemo onLog={addLog} />
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <EquityOptionsDemo onLog={addLog} />
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <RiskParametersDemo onLog={addLog} />
        </TabPanel>

        <TabPanel value={tab} index={5}>
          <PatientIntakeDemo onLog={addLog} />
        </TabPanel>

        <ActivityLog logs={logs} onClear={clearLogs} />
      </Container>
    </Box>
  );
}
