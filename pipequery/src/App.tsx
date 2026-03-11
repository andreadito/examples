import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Chip,
  Container,
} from '@mui/material';
import DataObjectIcon from '@mui/icons-material/DataObject';
import Playground from './demo/Playground.tsx';

export default function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar variant="dense">
          <DataObjectIcon sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1.1rem' }}>
            PipeQuery
          </Typography>
          <Chip label="Playground" size="small" color="primary" variant="outlined" />
        </Toolbar>
      </AppBar>
      <Container maxWidth={false} sx={{ mt: 2, mb: 2, flex: 1, px: 2 }}>
        <Playground />
      </Container>
    </Box>
  );
}
