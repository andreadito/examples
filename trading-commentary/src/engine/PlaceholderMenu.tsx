import { useState, useMemo } from 'react';
import {
  Popover,
  List,
  ListSubheader,
  ListItemButton,
  ListItemText,
  TextField,
  InputAdornment,
  Box,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { PlaceholderCategory } from '../types';

interface PlaceholderMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  categories: PlaceholderCategory[];
  prefix: string;
  onSelect: (token: string) => void;
}

export function PlaceholderMenu({
  anchorEl,
  open,
  onClose,
  categories,
  prefix,
  onSelect,
}: PlaceholderMenuProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        placeholders: cat.placeholders.filter(
          (p) =>
            p.label.toLowerCase().includes(q) ||
            p.token.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.placeholders.length > 0);
  }, [categories, search]);

  const handleSelect = (token: string) => {
    onSelect(token);
    setSearch('');
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={() => {
        setSearch('');
        onClose();
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            width: 340,
            maxHeight: 400,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          },
        },
      }}
    >
      <Box sx={{ p: 1, pb: 0 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search placeholders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <List
        dense
        sx={{
          maxHeight: 320,
          overflowY: 'auto',
          '& .MuiListSubheader-root': {
            bgcolor: 'background.paper',
            lineHeight: '32px',
            fontWeight: 700,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'primary.main',
          },
        }}
      >
        {filtered.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 2, textAlign: 'center', fontStyle: 'italic' }}
          >
            No placeholders match
          </Typography>
        )}
        {filtered.map((cat) => (
          <Box key={cat.id}>
            <ListSubheader>{cat.label}</ListSubheader>
            {cat.placeholders.map((p) => (
              <ListItemButton
                key={p.token}
                onClick={() => handleSelect(p.token)}
                sx={{ py: 0.5 }}
              >
                <ListItemText
                  primary={p.label}
                  secondary={
                    <Box
                      component="span"
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.65rem',
                          color: 'text.secondary',
                        }}
                      >
                        {prefix}{p.token}
                      </Typography>
                      {p.example && (
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            color: 'success.main',
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.65rem',
                          }}
                        >
                          {p.example}
                        </Typography>
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontSize: '0.8rem',
                  }}
                />
              </ListItemButton>
            ))}
          </Box>
        ))}
      </List>
    </Popover>
  );
}
