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
  const delta = typeof props.delta === 'number' ? props.delta : null;
  const deltaColor = delta === null ? undefined : delta >= 0 ? 'success.main' : 'error.main';
  return (
    <Box sx={toSx(props.sx as SxSubset | null | undefined)}>
      <MuiTypography variant="caption" color="text.secondary" component="div">
        {String(props.label ?? '')}
      </MuiTypography>
      <MuiTypography variant="h5" color={tokenToMuiColor(props.color as ColorToken | null | undefined)} component="div">
        {formatValue(props.value, (props.format as string | null | undefined) ?? null)}
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

export const displayComponents: Record<string, FunctionComponent<JsonRenderComponentProps>> = {
  Typography: TypographyImpl,
  Chip: ChipImpl,
  Alert: AlertImpl,
  LinearProgress: LinearProgressImpl,
  StatTile: StatTileImpl,
  DataList: DataListImpl,
};
