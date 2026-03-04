import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { EmailTable } from './EmailTable';
import type { ColDef } from '../types';

/**
 * Render an email-safe HTML table string from column definitions and row data.
 * Uses ReactDOMServer.renderToStaticMarkup — no hydration markers in output.
 */
export function renderToHtml(
  rowData: Record<string, unknown>[],
  columnDefs: ColDef[],
): string {
  return renderToStaticMarkup(
    createElement(EmailTable, { columnDefs, rowData }),
  );
}
