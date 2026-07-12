import type { FunctionComponent } from 'react';
import {
  Alert as MuiAlert,
  Box,
  Chip as MuiChip,
  LinearProgress as MuiLinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography as MuiTypography,
} from '@mui/material';
import type { JsonRenderComponentProps } from '../extension';
import { toSx, tokenToMuiColor } from '../styleTokens';
import type { ColorToken, SxSubset } from '../styleTokens';
import { formatValue } from './format';

function TypographyImpl({ props }: JsonRenderComponentProps) {
  return (
    <MuiTypography
      variant={(props.variant as never) ?? 'body1'}
      color={tokenToMuiColor(props.color as ColorToken | null | undefined)}
      sx={toSx(props.sx as SxSubset | null | undefined)}
    >
      {String(props.text ?? '')}
    </MuiTypography>
  );
}

function ChipImpl({ props }: JsonRenderComponentProps) {
  return (
    <MuiChip
      label={String(props.label ?? '')}
      color={tokenToMuiColor(props.color as ColorToken | null | undefined)}
      size={props.size === 'sm' ? 'small' : undefined}
    />
  );
}

function AlertImpl({ props }: JsonRenderComponentProps) {
  return <MuiAlert severity={(props.severity as never) ?? 'info'}>{String(props.text ?? '')}</MuiAlert>;
}

function LinearProgressImpl({ props }: JsonRenderComponentProps) {
  const value = typeof props.value === 'number' ? props.value : undefined;
  return (
    <MuiLinearProgress
      variant={value === undefined ? 'indeterminate' : 'determinate'}
      value={value}
      color={tokenToMuiColor(props.color as ColorToken | null | undefined)}
    />
  );
}

function StatTileImpl({ props }: JsonRenderComponentProps) {
  // A $computed that resolves to an array/object (e.g. aggregateBy instead of
  // sum) must not render as "[object Object]" — show a placeholder instead.
  const rawValue = props.value;
  const displayValue = typeof rawValue === 'string' || typeof rawValue === 'number' ? rawValue : '—';
  const delta = typeof props.delta === 'number' ? props.delta : null;
  const deltaColor = delta === null ? undefined : delta >= 0 ? 'success.main' : 'error.main';
  return (
    <Box sx={toSx(props.sx as SxSubset | null | undefined)}>
      <MuiTypography variant="caption" color="text.secondary" component="div">
        {String(props.label ?? '')}
      </MuiTypography>
      <MuiTypography variant="h5" color={tokenToMuiColor(props.color as ColorToken | null | undefined)} component="div">
        {formatValue(displayValue, (props.format as string | null | undefined) ?? null)}
      </MuiTypography>
      {delta !== null ? (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <MuiTypography variant="body2" sx={{ color: deltaColor }}>
            {delta >= 0 ? '▲' : '▼'} {formatValue(Math.abs(delta), 'percent')}
          </MuiTypography>
        </Stack>
      ) : null}
    </Box>
  );
}

function DataListImpl({ props }: JsonRenderComponentProps) {
  const rows = Array.isArray(props.data) ? (props.data as Array<Record<string, unknown>>) : [];
  const primaryField = String(props.primaryField ?? '');
  const secondaryField = (props.secondaryField as string | null | undefined) ?? null;
  const valueField = (props.valueField as string | null | undefined) ?? null;
  const valueFormat = (props.valueFormat as string | null | undefined) ?? null;
  return (
    <List dense disablePadding>
      {rows.map((row, i) => (
        <ListItem
          key={i}
          secondaryAction={
            valueField ? <MuiTypography variant="body2">{formatValue(row[valueField], valueFormat)}</MuiTypography> : undefined
          }
        >
          <ListItemText
            primary={String(row[primaryField] ?? '')}
            secondary={secondaryField ? String(row[secondaryField] ?? '') : undefined}
          />
        </ListItem>
      ))}
    </List>
  );
}


type TickerRow = Record<string, unknown>;

const SPEED_SECONDS_PER_ITEM = { slow: 4, normal: 2.5, fast: 1.5 } as const;

/**
 * NYSE-style scrolling ticker tape. The item strip is rendered twice and
 * animated from 0 to -50%, which loops seamlessly because the second half is
 * an exact copy of the first. Pauses on hover so values can be read.
 */
function TickerTapeImpl({ props }: JsonRenderComponentProps) {
  const rows = Array.isArray(props.data) ? (props.data as TickerRow[]) : [];
  const labelKey = typeof props.labelKey === 'string' ? props.labelKey : 'symbol';
  const valueKey = typeof props.valueKey === 'string' ? props.valueKey : 'value';
  const changeKey = typeof props.changeKey === 'string' ? props.changeKey : null;
  const changeFormat = props.changeFormat === 'number' ? 'delta' : 'percent';
  const speed = (props.speed as keyof typeof SPEED_SECONDS_PER_ITEM) ?? 'normal';
  const duration = Math.max(10, rows.length * (SPEED_SECONDS_PER_ITEM[speed] ?? 2.5));

  const items = rows.map((row, i) => {
    const change = changeKey ? Number(row[changeKey]) : NaN;
    const hasChange = Number.isFinite(change);
    return (
      <Box key={i} component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.75, px: 1.5 }}>
        <MuiTypography component="span" variant="body2" sx={{ fontWeight: 700 }}>
          {String(row[labelKey] ?? '')}
        </MuiTypography>
        <MuiTypography component="span" variant="body2" color="text.secondary">
          {formatValue(row[valueKey], 'currency')}
        </MuiTypography>
        {hasChange ? (
          <MuiTypography
            component="span"
            variant="body2"
            sx={{ color: change >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}
          >
            {change >= 0 ? '\u25b2' : '\u25bc'}
            {changeFormat === 'percent' ? formatValue(Math.abs(change), 'percent') : formatValue(Math.abs(change), 'delta')}
          </MuiTypography>
        ) : null}
      </Box>
    );
  });

  if (items.length === 0) return null;

  return (
    <Box
      sx={{
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 0.5,
        width: '100%',
        '&:hover .ticker-track': { animationPlayState: 'paused' },
        '@keyframes generative-ui-ticker-scroll': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      }}
    >
      <Box
        className="ticker-track"
        sx={{ display: 'inline-flex', animation: `generative-ui-ticker-scroll ${duration}s linear infinite` }}
      >
        <Box component="span" sx={{ display: 'inline-flex' }}>{items}</Box>
        <Box component="span" sx={{ display: 'inline-flex' }} aria-hidden>
          {items}
        </Box>
      </Box>
    </Box>
  );
}

export const displayComponents: Record<string, FunctionComponent<JsonRenderComponentProps>> = {
  Typography: TypographyImpl,
  Chip: ChipImpl,
  Alert: AlertImpl,
  LinearProgress: LinearProgressImpl,
  StatTile: StatTileImpl,
  DataList: DataListImpl,
  TickerTape: TickerTapeImpl,
};
