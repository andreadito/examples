import { isValidElement, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CSSProperties } from 'react';
import type { ColDef } from '../types';
import { NUMERIC_CELL_OVERRIDE } from './styles';

// ─── Nested Field Access ─────────────────────────────────────────────────────

function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  let current: unknown = obj;
  for (const segment of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object')
      return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

// ─── Value Pipeline ──────────────────────────────────────────────────────────

/** Get the raw value for a cell (valueGetter > data[field]). */
export function getRawValue(
  colDef: ColDef,
  data: Record<string, unknown>,
): unknown {
  if (colDef.valueGetter) {
    return colDef.valueGetter({
      data,
      colDef,
      value: colDef.field ? getNestedValue(data, colDef.field) : undefined,
    });
  }
  if (colDef.field) {
    return getNestedValue(data, colDef.field);
  }
  return undefined;
}

/** Format a raw value using valueFormatter. Returns null if no formatter. */
export function getFormattedValue(
  colDef: ColDef,
  rawValue: unknown,
  data: Record<string, unknown>,
): string | null {
  if (!colDef.valueFormatter) return null;
  return colDef.valueFormatter({ value: rawValue, data, colDef });
}

/** Detect if cellRenderer is a React component (class or named function component). */
function isComponent(
  renderer: NonNullable<ColDef['cellRenderer']>,
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((renderer as any).prototype?.isReactComponent) return true;
  if (typeof renderer === 'function' && /^[A-Z]/.test(renderer.name || ''))
    return true;
  return false;
}

/**
 * Resolve the full cell content through the value pipeline.
 * Returns a string (may contain HTML from cellRenderer).
 */
export function resolveCellContent(
  colDef: ColDef,
  data: Record<string, unknown>,
): string {
  const rawValue = getRawValue(colDef, data);
  const formattedValue = getFormattedValue(colDef, rawValue, data);

  if (colDef.cellRenderer) {
    const params = { value: rawValue, valueFormatted: formattedValue, data, colDef };

    if (isComponent(colDef.cellRenderer)) {
      // React component — render to static markup
      const element = createElement(
        colDef.cellRenderer as React.ComponentType<typeof params>,
        params,
      );
      return renderToStaticMarkup(element);
    }

    // Function-style renderer
    const result = (colDef.cellRenderer as (p: typeof params) => React.ReactNode)(params);
    if (typeof result === 'string') return result;
    if (typeof result === 'number') return String(result);
    if (isValidElement(result)) return renderToStaticMarkup(result);
    return String(result ?? '');
  }

  return formattedValue ?? String(rawValue ?? '');
}

/** Resolve cellStyle for a given cell (static object or function). */
export function resolveCellStyle(
  colDef: ColDef,
  rawValue: unknown,
  data: Record<string, unknown>,
): CSSProperties | undefined {
  const isNumeric = isNumericType(colDef.type);
  const typeStyle = isNumeric ? NUMERIC_CELL_OVERRIDE : undefined;

  let customStyle: CSSProperties | undefined;
  if (colDef.cellStyle) {
    if (typeof colDef.cellStyle === 'function') {
      customStyle = colDef.cellStyle({ value: rawValue, data, colDef }) ?? undefined;
    } else {
      customStyle = colDef.cellStyle;
    }
  }

  if (!typeStyle && !customStyle) return undefined;
  return { ...typeStyle, ...customStyle };
}

function isNumericType(type: string | string[] | undefined): boolean {
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.includes('numericColumn');
}
