import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { CustomSource } from './dataSources';
import { parseSourceValue, validateName } from './dataSources';

export interface DataSourcesDialogProps {
  open: boolean;
  onClose: () => void;
  sources: CustomSource[];
  urlErrors: Record<string, string>;
  onAdd: (source: CustomSource) => void;
  onRemove: (name: string) => void;
}

const PLACEHOLDER_JSON = '[{"region": "EMEA", "revenue": 1250000, "margin": 0.34}, {"region": "APAC", "revenue": 980000, "margin": 0.29}]';

/** Add/remove custom data sources: pasted JSON or fetched URLs. */
export function DataSourcesDialog({ open, onClose, sources, urlErrors, onAdd, onRemove }: DataSourcesDialogProps) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'json' | 'url'>('json');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [refreshSec, setRefreshSec] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const nameError = validateName(name, sources.map((s) => s.name));
    if (nameError) {
      setError(nameError);
      return;
    }
    if (mode === 'json') {
      try {
        parseSourceValue(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return;
      }
      onAdd({ name: name.trim(), mode, text });
    } else {
      if (!/^https?:\/\//.test(url)) {
        setError('URL must start with http(s)://');
        return;
      }
      const refresh = Number(refreshSec);
      onAdd({ name: name.trim(), mode, url, refreshSec: Number.isFinite(refresh) && refresh > 0 ? refresh : undefined });
    }
    setName('');
    setText('');
    setUrl('');
    setRefreshSec('');
    setError(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Custom data sources</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Any JSON that is an array of objects (rows) or a single object with fields. Each source becomes
          <code> /data/&lt;name&gt;</code> — just ask the chat to build with it.
        </Typography>

        {sources.length > 0 ? (
          <List dense sx={{ border: '1px solid', borderColor: 'divider', mb: 2 }}>
            {sources.map((source) => (
              <ListItem
                key={source.name}
                secondaryAction={
                  <IconButton edge="end" size="small" aria-label={`remove ${source.name}`} onClick={() => onRemove(source.name)}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <code>{source.name}</code>
                      <Chip label={source.mode === 'json' ? 'inline JSON' : `URL${source.refreshSec ? ` · ${source.refreshSec}s` : ''}`} size="small" />
                      {urlErrors[source.name] ? <Chip label={urlErrors[source.name]} size="small" color="error" /> : null}
                    </Stack>
                  }
                  secondary={source.mode === 'url' ? source.url : undefined}
                />
              </ListItem>
            ))}
          </List>
        ) : null}

        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="sales" sx={{ flex: 1 }} />
            <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
              <ToggleButton value="json">Paste JSON</ToggleButton>
              <ToggleButton value="url">Fetch URL</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          {mode === 'json' ? (
            <TextField
              label="JSON"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER_JSON}
              multiline
              minRows={4}
              slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.75rem' } } }}
            />
          ) : (
            <Stack direction="row" spacing={1.5}>
              <TextField label="URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/rows" sx={{ flex: 1 }} />
              <TextField label="Refresh (s)" value={refreshSec} onChange={(e) => setRefreshSec(e.target.value)} placeholder="0" sx={{ width: 110 }} />
            </Stack>
          )}
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Box>
            <Button variant="contained" onClick={add}>
              Add source
            </Button>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
