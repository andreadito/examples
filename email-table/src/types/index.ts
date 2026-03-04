import type { CSSProperties, ReactNode, ComponentType } from 'react';

// ─── ag-grid Compatible Param Interfaces ─────────────────────────────────────

export interface ValueGetterParams {
  data: Record<string, unknown>;
  colDef: ColDef;
  value: unknown;
}

export interface ValueFormatterParams {
  value: unknown;
  data: Record<string, unknown>;
  colDef: ColDef;
}

export interface CellRendererParams {
  value: unknown;
  valueFormatted: string | null;
  data: Record<string, unknown>;
  colDef: ColDef;
}

export interface CellStyleParams {
  value: unknown;
  data: Record<string, unknown>;
  colDef: ColDef;
}

// ─── ColDef (ag-grid Compatible — No ag-grid Dependency) ─────────────────────

export interface ColDef {
  /** The field path in the row data object (supports dot notation) */
  field?: string;
  /** Display name for the column header. Falls back to field if omitted. */
  headerName?: string;
  /** Column type hint: 'numericColumn' right-aligns, 'dateColumn', etc. */
  type?: string | string[];
  /** If true, the column is hidden */
  hide?: boolean;
  /** Fixed column width in pixels */
  width?: number;
  /** Minimum column width in pixels */
  minWidth?: number;
  /** Flex value for proportional width distribution */
  flex?: number;
  /** Pin column to 'left' or 'right' */
  pinned?: 'left' | 'right' | boolean;

  // ─── Value Pipeline ──────────────────────────────────────────────────────

  /** Extract a raw value from the row data. Overrides field-based lookup. */
  valueGetter?: (params: ValueGetterParams) => unknown;
  /** Format the raw value for display. Returns a display string. */
  valueFormatter?: (params: ValueFormatterParams) => string;
  /**
   * Render the cell content. Can be:
   * - A function returning a string or ReactNode
   * - A React component receiving CellRendererParams as props
   */
  cellRenderer?:
    | ((params: CellRendererParams) => ReactNode)
    | ComponentType<CellRendererParams>;
  /**
   * Inline styles for the cell. Can be:
   * - A static CSSProperties object
   * - A function receiving params and returning CSSProperties
   */
  cellStyle?:
    | CSSProperties
    | ((params: CellStyleParams) => CSSProperties | undefined | null);

  // ─── Column Groups ──────────────────────────────────────────────────────

  /** Child column definitions. Presence of children makes this a group header. */
  children?: ColDef[];
}

// ─── EmailTable Component Props ──────────────────────────────────────────────

export interface EmailTableProps {
  /** Column definitions (ag-grid compatible subset) */
  columnDefs: ColDef[];
  /** Array of row data objects */
  rowData: Record<string, unknown>[];
}
