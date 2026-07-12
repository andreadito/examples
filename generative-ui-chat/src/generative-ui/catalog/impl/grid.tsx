import type { FunctionComponent } from 'react';
import { Box } from '@mui/material';
import { DataGrid as MuiDataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import type { JsonRenderComponentProps } from '../extension';
import { formatValue } from './format';

type Row = Record<string, unknown>;
type ColumnSpec = { field: string; headerName?: string | null; format?: string | null; width?: number | null };

function DataGridImpl({ props }: JsonRenderComponentProps) {
  const rows = Array.isArray(props.data) ? (props.data as Row[]) : [];
  const columnSpecs = Array.isArray(props.columns) ? (props.columns as ColumnSpec[]) : [];

  const columns: GridColDef[] = columnSpecs.map((col) => ({
    field: col.field,
    headerName: col.headerName ?? col.field,
    width: col.width ?? undefined,
    valueFormatter: (value: unknown) => formatValue(value, col.format ?? null),
    ...(col.format === 'delta'
      ? {
          renderCell: (params: { value?: unknown }) => {
            const n = Number(params.value);
            const colored = Number.isFinite(n) ? (n >= 0 ? 'success.main' : 'error.main') : undefined;
            return <Box component="span" sx={{ color: colored }}>{formatValue(params.value, 'delta')}</Box>;
          },
        }
      : {}),
  }));

  const rowsWithId = rows.map((row, i) => ({ ...row, id: row.id ?? i }));

  return (
    <Box sx={{ height: (props.height as number | null | undefined) ?? 360, width: '100%' }}>
      <MuiDataGrid
        rows={rowsWithId}
        columns={columns}
        density={(props.density as 'compact' | 'standard' | null | undefined) ?? 'compact'}
        columnHeaderHeight={32}
        disableRowSelectionOnClick
      />
    </Box>
  );
}

export const gridComponents: Record<string, FunctionComponent<JsonRenderComponentProps>> = {
  DataGrid: DataGridImpl,
};
