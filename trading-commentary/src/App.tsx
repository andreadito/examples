import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Chip,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { TradingCommentaryDemo } from './demo/TradingCommentaryDemo';

export default function App() {
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

      <Container maxWidth="xl" sx={{ mt: 3, mb: 4, flex: 1 }}>
        <TradingCommentaryDemo />
      </Container>
    </Box>
  );
}
