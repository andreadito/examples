import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { JsonTree } from '../generative-ui/JsonTree';
import type { CustomSource } from './dataSources';
import { parseSourceValue, validateName } from './dataSources';

export interface DataSourcesDialogProps {
  open: boolean;
  onClose: () => void;
  /** Every dataset behind the canvas (built-in feeds + custom sources), unfiltered. */
  datasets: Record<string, unknown>;
  /** Dataset names currently excluded from the model's data. */
  disabled: string[];
  onToggleDataset: (name: string) => void;
  sources: CustomSource[];
  urlErrors: Record<string, string>;
  onAdd: (source: CustomSource) => void;
  onRemove: (name: string) => void;
}

const PLACEHOLDER_JSON = '[{"region": "EMEA", "revenue": 1250000, "margin": 0.34}, {"region": "APAC", "revenue": 980000, "margin": 0.29}]';
const PREVIEW_ROWS = 20;

function summarize(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} rows`;
  if (value && typeof value === 'object') return `${Object.keys(value).length} fields`;
  const text = JSON.stringify(value);
  return text.length > 24 ? `${text.slice(0, 24)}…` : text;
}

function DatasetRow({
  name,
  value,
  enabled,
  onToggle,
  source,
  error,
  onRemove,
}: {
  name: string;
  value: unknown;
  enabled: boolean;
  onToggle: () => void;
  source?: CustomSource;
  error?: string;
  onRemove?: () => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const rows = Array.isArray(value) ? value.length : 0;
  // Big feeds (e.g. 1000 API bars) would make the tree unwieldy — preview a slice.
  const preview = Array.isArray(value) ? value.slice(0, PREVIEW_ROWS) : value;

  return (
    <>
      <ListItem
        disablePadding
        sx={{ opacity: enabled ? 1 : 0.5, pr: 1 }}
        secondaryAction={
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" aria-label={`preview ${name}`} onClick={() => setPreviewOpen((o) => !o)}>
              {previewOpen ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
            </IconButton>
            {onRemove ? (
              <IconButton edge="end" size="small" aria-label={`remove ${name}`} onClick={onRemove}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            ) : null}
          </Stack>
        }
      >
        <Checkbox size="small" checked={enabled} onChange={onToggle} slotProps={{ input: { 'aria-label': `use ${name}` } }} />
        <ListItemText
          primary={
            <Stack direction="row" spacing={1} alignItems="center">
              <code>{name}</code>
              <Chip label={summarize(value)} size="small" variant="outlined" />
              {source ? (
                <Chip
                  label={source.mode === 'json' ? 'custom' : `URL${source.refreshSec ? ` · ${source.refreshSec}s` : ''}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ) : null}
              {error ? <Chip label={error} size="small" color="error" /> : null}
            </Stack>
          }
          secondary={source?.mode === 'url' ? source.url : undefined}
        />
      </ListItem>
      <Collapse in={previewOpen} unmountOnExit>
        <Box
          sx={{
            mx: 1.5,
            mb: 1,
            p: 1,
            maxHeight: 240,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            fontSize: '0.6875rem',
          }}
        >
          {rows > PREVIEW_ROWS ? (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
              first {PREVIEW_ROWS} of {rows} rows
            </Typography>
          ) : null}
          <JsonTree value={preview} defaultDepth={2} />
        </Box>
      </Collapse>
    </>
  );
}

/**
 * The data panel: preview every dataset behind the canvas, choose which ones
 * the model can see, and add/remove custom sources (pasted JSON or URLs).
 */
export function DataSourcesDialog({
  open,
  onClose,
  datasets,
  disabled,
  onToggleDataset,
  sources,
  urlErrors,
  onAdd,
  onRemove,
}: DataSourcesDialogProps) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'json' | 'url'>('json');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [refreshSec, setRefreshSec] = useState('');
  const [error, setError] = useState<string | null>(null);

  const customByName = new Map(sources.map((s) => [s.name, s]));

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
      <DialogTitle>Data</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Everything the model can build with, live. Untick a dataset to hide it from the model — it disappears
          from <code>/data</code>, so already-rendered UIs bound to it will go empty until re-enabled.
        </Typography>

        <List dense sx={{ border: '1px solid', borderColor: 'divider', mb: 2, py: 0 }}>
          {Object.entries(datasets).map(([key, value]) => (
            <DatasetRow
              key={key}
              name={key}
              value={value}
              enabled={!disabled.includes(key)}
              onToggle={() => onToggleDataset(key)}
              source={customByName.get(key)}
              error={urlErrors[key]}
              onRemove={customByName.has(key) ? () => onRemove(key) : undefined}
            />
          ))}
        </List>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Add a source
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Any JSON that is an array of objects (rows) or a single object with fields. Each source becomes
          <code> /data/&lt;name&gt;</code> — just ask the chat to build with it.
        </Typography>

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
