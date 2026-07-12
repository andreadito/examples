import { ModuleRegistry, AllCommunityModule, colorSchemeDark, themeQuartz } from 'ag-grid-community';
import { useTheme } from '@mui/material/styles';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { JsonRenderComponentProps } from '../../extension';
import { formatValue } from '../format';

// Register AG Grid Community modules once at module scope (not per render/mount).
// ag-grid-community v33+ uses the Theming API by default (no CSS imports needed) —
// `themeQuartz` is applied explicitly below for a deterministic look regardless of
// any legacy `ag-theme-*` classNames elsewhere in the host app.
ModuleRegistry.registerModules([AllCommunityModule]);

type Row = Record<string, unknown>;
type ColumnSpec = {
  field: string;
  headerName?: string | null;
  format?: string | null;
  pinned?: string | boolean | null;
  width?: number | null;
};

const darkTheme = themeQuartz.withPart(colorSchemeDark);

export function AdvancedGridImpl({ props }: JsonRenderComponentProps) {
  const { palette } = useTheme();
  const rows = Array.isArray(props.data) ? (props.data as Row[]) : [];
  const columnSpecs = Array.isArray(props.columns) ? (props.columns as ColumnSpec[]) : [];
  const filterable = !!props.filterable;
  const height = (props.height as number | null | undefined) ?? 360;

  const columnDefs: ColDef[] = columnSpecs.map((col) => ({
    field: col.field,
    headerName: col.headerName ?? col.field,
    width: col.width ?? undefined,
    // Only 'left'/'right'/true pin (true pins left); every other dialect
    // ('none', false, 'false', ...) means unpinned.
    pinned:
      col.pinned === true || col.pinned === 'true'
        ? 'left'
        : col.pinned === 'left' || col.pinned === 'right'
          ? col.pinned
          : undefined,
    sortable: true,
    filter: filterable,
    valueFormatter: (params) => formatValue(params.value, col.format ?? null),
    ...(col.format === 'delta'
      ? {
          cellStyle: (params) => {
            const n = Number(params.value);
            if (!Number.isFinite(n)) return null;
            return { color: n >= 0 ? palette.success.main : palette.error.main };
          },
        }
      : {}),
  }));

  return (
    <div style={{ height, width: '100%' }}>
      <AgGridReact theme={palette.mode === 'dark' ? darkTheme : themeQuartz} rowData={rows} columnDefs={columnDefs} />
    </div>
  );
}
