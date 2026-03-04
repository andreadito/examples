import React, { type CSSProperties } from 'react';
import type { EmailTableProps } from '../types';
import { resolveColumns } from './columnResolver';
import { resolveCellContent, resolveCellStyle, getRawValue } from './valueResolver';
import {
  TABLE_STYLES,
  HEADER_CELL_STYLES,
  GROUP_HEADER_CELL_STYLES,
  CELL_STYLES_ODD,
  CELL_STYLES_EVEN,
  PINNED_LEFT_BORDER,
  PINNED_RIGHT_BORDER,
} from './styles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function containsHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EmailTable({ columnDefs, rowData }: EmailTableProps) {
  const { leafColumns, headerRows } = resolveColumns(columnDefs);

  return (
    <table
      style={TABLE_STYLES}
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
    >
      <thead>
        {headerRows.map((row, rowIdx) => (
          <tr key={rowIdx}>
            {row.map((cell, cellIdx) => {
              const isGroup = rowIdx < headerRows.length - 1 || cell.colspan > 1;
              const style: CSSProperties = {
                ...(isGroup ? GROUP_HEADER_CELL_STYLES : HEADER_CELL_STYLES),
              };
              return (
                <th
                  key={cellIdx}
                  colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                  rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                  style={style}
                >
                  {cell.headerName}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {rowData.map((data, rowIdx) => (
          <tr key={rowIdx}>
            {leafColumns.map((col, colIdx) => {
              const { colDef, computedWidth } = col;
              const rawValue = getRawValue(colDef, data);
              const content = resolveCellContent(colDef, data);
              const customStyle = resolveCellStyle(colDef, rawValue, data);
              const baseStyle =
                rowIdx % 2 === 0 ? CELL_STYLES_ODD : CELL_STYLES_EVEN;

              const cellStyle: CSSProperties = {
                ...baseStyle,
                width: computedWidth,
                ...(colDef.pinned === 'left' ? PINNED_LEFT_BORDER : {}),
                ...(colDef.pinned === 'right' ? PINNED_RIGHT_BORDER : {}),
                ...customStyle,
              };

              const hasHtml = containsHtml(content);

              return (
                <td
                  key={colIdx}
                  style={cellStyle}
                  dangerouslySetInnerHTML={
                    hasHtml ? { __html: content } : undefined
                  }
                >
                  {hasHtml ? undefined : content}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
