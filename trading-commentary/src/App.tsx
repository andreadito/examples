import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { TradingCommentaryDemo } from './demo/TradingCommentaryDemo';
import { ResearchNoteDemo } from './demo/ResearchNoteDemo';
import { RiskReportDemo } from './demo/RiskReportDemo';
import { ClientCommsDemo } from './demo/ClientCommsDemo';
import { IncidentReportDemo } from './demo/IncidentReportDemo';

const TABS = [
  { label: 'Trade Commentary', component: TradingCommentaryDemo },
  { label: 'Research Note', component: ResearchNoteDemo },
  { label: 'Risk Report', component: RiskReportDemo },
  { label: 'Client Comms', component: ClientCommsDemo },
  { label: 'Incident Report', component: IncidentReportDemo },
];

export default function App() {
  const [tab, setTab] = useState(0);
  const ActiveDemo = TABS[tab].component;

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
          <EditNoteIcon sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Trading Commentary
          </Typography>
          <Chip label="Demo" size="small" color="primary" variant="outlined" />
        </Toolbar>
      </AppBar>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
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
        <ActiveDemo />
      </Container>
    </Box>
  );
}
