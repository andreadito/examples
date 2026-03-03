import { useState, useCallback, useRef } from 'react';
import MDEditor, { commands, type ICommand } from '@uiw/react-md-editor';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Chip,
  alpha,
} from '@mui/material';
import DataObjectIcon from '@mui/icons-material/DataObject';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { CommentaryConfig, PlaceholderCategory, PlaceholderReplacer } from '../types';
import { PlaceholderMenu } from './PlaceholderMenu';
import { usePlaceholderResolver } from './usePlaceholderResolver';

// ─── Toolbar Mapping ─────────────────────────────────────────────────────────

const TOOLBAR_MAP: Record<string, ICommand> = {
  bold: commands.bold,
  italic: commands.italic,
  heading: commands.title3,
  'unordered-list': commands.unorderedListCommand,
  'ordered-list': commands.orderedListCommand,
  code: commands.code,
  table: commands.table,
  link: commands.link,
  quote: commands.quote,
  strikethrough: commands.strikethrough,
};

const DEFAULT_TOOLBAR = ['bold', 'italic', 'heading', 'unordered-list', 'code', 'table'];

// ─── Dark Theme Overrides ────────────────────────────────────────────────────

const editorOverrides = {
  '& .w-md-editor': {
    bgcolor: '#131920',
    borderColor: 'rgba(255,255,255,0.06)',
    color: '#e0e6ed',
    boxShadow: 'none',
    borderRadius: 1,
  },
  '& .w-md-editor-toolbar': {
    bgcolor: '#0f1419',
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: '8px 8px 0 0',
  },
  '& .w-md-editor-toolbar li > button': {
    color: '#8899aa',
    '&:hover': { color: '#5b9cf6' },
  },
  '& .w-md-editor-toolbar li.active > button': {
    color: '#5b9cf6',
  },
  '& .w-md-editor-content': {
    bgcolor: '#131920',
  },
  '& .w-md-editor-text-pre > code, & .w-md-editor-text-input, & .w-md-editor-text': {
    color: '#e0e6ed !important',
    fontSize: '0.85rem !important',
    lineHeight: '1.6 !important',
  },
  '& .wmde-markdown': {
    bgcolor: '#131920',
    color: '#e0e6ed',
  },
  '& .w-md-editor-preview .wmde-markdown': {
    bgcolor: '#0f1419',
  },
} as const;

// ─── Props ───────────────────────────────────────────────────────────────────

interface TradingCommentaryProps {
  /** The commentary config (100% JSON-serializable, can come from DB) */
  config: CommentaryConfig;
  /** Current markdown value (controlled component) */
  value: string;
  /** Called when the markdown content changes */
  onChange: (value: string) => void;
  /** Replaces placeholder tokens with real data for the preview */
  replacer: PlaceholderReplacer;
  /** Optional placeholder categories for the picker menu. Pass dynamically from context data. */
  categories?: PlaceholderCategory[];
  /** Read-only mode */
  readOnly?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TradingCommentary({
  config,
  value,
  onChange,
  replacer,
  categories,
  readOnly = false,
}: TradingCommentaryProps) {
  const prefix = config.placeholderPrefix ?? ':::';
  const editorHeight = config.editor?.height ?? 300;
  const maxLength = config.editor?.maxLength;
  const showPreviewDefault = config.editor?.showPreview !== false;

  const [showPreview, setShowPreview] = useState(showPreviewDefault);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Resolve placeholders for preview
  const { resolved, unresolvedCount } = usePlaceholderResolver(value, prefix, replacer);

  // Build toolbar commands from config
  const toolbarItems = config.editor?.toolbar ?? DEFAULT_TOOLBAR;
  const toolbarCommands = toolbarItems
    .map((name) => TOOLBAR_MAP[name])
    .filter(Boolean);

  // Insert placeholder at cursor
  const handleInsertPlaceholder = useCallback(
    (token: string) => {
      const textarea = editorRef.current?.querySelector('textarea');
      if (!textarea) {
        // Fallback: append to end
        onChange(value + `${prefix}${token}`);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const insert = `${prefix}${token}`;
      const newValue = value.substring(0, start) + insert + value.substring(end);
      onChange(newValue);

      // Restore focus and cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + insert.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    },
    [value, onChange, prefix],
  );

  const handleChange = useCallback(
    (val?: string) => {
      const newVal = val ?? '';
      if (maxLength && newVal.length > maxLength) return;
      onChange(newVal);
    },
    [onChange, maxLength],
  );

  return (
    <Paper elevation={0} sx={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {config.title}
          </Typography>
          {config.description && (
            <Typography variant="caption" color="text.secondary">
              {config.description}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {!readOnly && categories && categories.length > 0 && (
            <Tooltip title="Insert placeholder">
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{ color: 'primary.main' }}
              >
                <DataObjectIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={showPreview ? 'Hide preview' : 'Show preview'}>
            <IconButton
              size="small"
              onClick={() => setShowPreview((v) => !v)}
              sx={{ color: showPreview ? 'primary.main' : 'text.secondary' }}
            >
              {showPreview ? (
                <VisibilityIcon fontSize="small" />
              ) : (
                <VisibilityOffIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Editor + Preview */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: showPreview ? 'row' : 'column' },
          minHeight: editorHeight,
        }}
      >
        {/* Editor */}
        <Box
          ref={editorRef}
          data-color-mode="dark"
          sx={{
            flex: 1,
            minWidth: 0,
            ...editorOverrides,
          }}
        >
          <MDEditor
            value={value}
            onChange={handleChange}
            height={editorHeight}
            preview="edit"
            commands={toolbarCommands}
            extraCommands={[]}
            visibleDragbar={false}
            hideToolbar={readOnly}
          />
        </Box>

        {/* Resolved Preview */}
        {showPreview && (
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              borderLeft: { md: 1 },
              borderTop: { xs: 1, md: 0 },
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                color="primary.main"
                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}
              >
                Resolved Preview
              </Typography>
              {unresolvedCount > 0 && (
                <Chip
                  label={`${unresolvedCount} unresolved`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.6rem' }}
                />
              )}
            </Box>
            <Box
              data-color-mode="dark"
              sx={{
                flex: 1,
                overflow: 'auto',
                p: 2,
                bgcolor: '#0f1419',
                '& .wmde-markdown': {
                  bgcolor: 'transparent',
                  color: '#e0e6ed',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  '& table': {
                    borderColor: 'rgba(255,255,255,0.1)',
                  },
                  '& th, & td': {
                    borderColor: 'rgba(255,255,255,0.1)',
                    padding: '4px 8px',
                  },
                  '& strong': {
                    color: '#5b9cf6',
                  },
                  '& h1, & h2, & h3': {
                    borderColor: 'rgba(255,255,255,0.08)',
                  },
                },
              }}
            >
              <MDEditor.Markdown source={resolved} />
            </Box>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.75,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          Use{' '}
          <Box
            component="code"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.65rem',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
              color: 'primary.main',
              px: 0.5,
              borderRadius: 0.5,
            }}
          >
            {prefix}token
          </Box>{' '}
          for dynamic data or click{' '}
          <DataObjectIcon sx={{ fontSize: 12, verticalAlign: 'middle' }} /> to insert
        </Typography>
        {maxLength && (
          <Typography
            variant="caption"
            color={value.length > maxLength * 0.9 ? 'warning.main' : 'text.secondary'}
            sx={{ fontSize: '0.7rem', fontFamily: '"JetBrains Mono", monospace' }}
          >
            {value.length} / {maxLength}
          </Typography>
        )}
      </Box>

      {/* Placeholder Menu */}
      {categories && categories.length > 0 && (
        <PlaceholderMenu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          categories={categories}
          prefix={prefix}
          onSelect={handleInsertPlaceholder}
        />
      )}
    </Paper>
  );
}
