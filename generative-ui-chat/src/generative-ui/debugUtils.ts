import type { StateStore } from './state/types';

/** One live binding discovered in a spec: where it lives and what it points at. */
export interface BindingRow {
  element: string;
  /** Prop path within the element, e.g. "data", "columns", "visible", "repeat". */
  prop: string;
  kind: '$state' | '$bindState' | '$computed' | '$template' | '$item' | 'repeat' | 'visible';
  /** Human-readable target: a state path, function call, or template. */
  detail: string;
  /** State path when the binding reads/writes one directly. */
  path?: string;
  /** Raw expression object (used for live evaluation of $computed). */
  expression?: Record<string, unknown>;
}

interface SpecElement {
  type?: string;
  props?: Record<string, unknown>;
  children?: string[];
  visible?: unknown;
  repeat?: { statePath?: string };
}

interface SpecShape {
  root?: string;
  elements?: Record<string, SpecElement>;
}

function isExpression(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).some((key) => key.startsWith('$'))
  );
}

function classify(expr: Record<string, unknown>): { kind: BindingRow['kind']; detail: string; path?: string } | null {
  if (typeof expr.$state === 'string') return { kind: '$state', detail: expr.$state, path: expr.$state };
  if (typeof expr.$bindState === 'string') return { kind: '$bindState', detail: `⇄ ${expr.$bindState}`, path: expr.$bindState };
  if (typeof expr.$computed === 'string') {
    const args = (expr.args ?? {}) as Record<string, unknown>;
    const argSummary = Object.entries(args)
      .map(([k, v]) => (isExpression(v) && typeof (v as Record<string, unknown>).$state === 'string' ? `${k}: ${(v as Record<string, unknown>).$state}` : `${k}: ${JSON.stringify(v)}`))
      .join(', ');
    return { kind: '$computed', detail: `${expr.$computed}(${argSummary})` };
  }
  if (typeof expr.$template === 'string') return { kind: '$template', detail: expr.$template };
  if (typeof expr.$item === 'string' || expr.$item === '') return { kind: '$item', detail: `item.${String(expr.$item) || '(self)'}` };
  return null;
}

function walkValue(elementKey: string, propPath: string, value: unknown, out: BindingRow[]): void {
  if (isExpression(value)) {
    const classified = classify(value);
    if (classified) {
      out.push({ element: elementKey, prop: propPath, expression: value, ...classified });
    }
    // $computed args may nest further $state expressions — surfaced via the
    // arg summary in `detail`, not as separate rows, to keep the table scannable.
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkValue(elementKey, `${propPath}[${i}]`, item, out));
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value)) walkValue(elementKey, `${propPath}.${k}`, v, out);
  }
}

/** Extract every data binding from a spec, in element order. */
export function extractBindings(spec: unknown): BindingRow[] {
  const out: BindingRow[] = [];
  const elements = (spec as SpecShape | null)?.elements;
  if (!elements || typeof elements !== 'object') return out;
  for (const [key, element] of Object.entries(elements)) {
    for (const [prop, value] of Object.entries(element.props ?? {})) {
      walkValue(key, prop, value, out);
    }
    if (element.visible !== undefined && element.visible !== null && typeof element.visible === 'object') {
      out.push({
        element: key,
        prop: 'visible',
        kind: 'visible',
        detail: JSON.stringify(element.visible),
        expression: element.visible as Record<string, unknown>,
      });
    }
    if (element.repeat?.statePath) {
      out.push({ element: key, prop: 'repeat', kind: 'repeat', detail: element.repeat.statePath, path: element.repeat.statePath });
    }
  }
  return out;
}

/** Shallow-resolve $state expressions inside a $computed args record. */
function resolveArgs(args: Record<string, unknown>, store: StateStore): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (isExpression(v) && typeof (v as Record<string, unknown>).$state === 'string') {
      resolved[k] = store.get((v as Record<string, unknown>).$state as string);
    } else {
      resolved[k] = v;
    }
  }
  return resolved;
}

/**
 * Evaluate a binding's CURRENT value against the live store (best-effort —
 * mirrors, not reuses, the renderer's resolution; $item/$template/visible
 * conditions are context-dependent and reported as such).
 */
export function resolveBinding(
  row: BindingRow,
  store: StateStore,
  functions: Record<string, (args: Record<string, unknown>) => unknown>,
): unknown {
  try {
    if (row.kind === '$state' || row.kind === '$bindState' || row.kind === 'repeat') {
      return row.path ? store.get(row.path) : undefined;
    }
    if (row.kind === '$computed' && row.expression) {
      const fn = functions[String(row.expression.$computed)];
      if (!fn) return '<unknown function>';
      return fn(resolveArgs((row.expression.args ?? {}) as Record<string, unknown>, store));
    }
    return '<context-dependent>';
  } catch (err) {
    return `<error: ${err instanceof Error ? err.message : String(err)}>`;
  }
}

/** Compact single-line preview of any value, for table cells. */
export function preview(value: unknown, max = 80): string {
  let text: string;
  try {
    text = typeof value === 'string' ? `"${value}"` : (JSON.stringify(value) ?? 'undefined');
  } catch {
    text = String(value);
  }
  if (Array.isArray(value)) text = `[${value.length}] ${text}`;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export interface PathMatch {
  path: string;
  value: unknown;
}

/** Flat search over a state snapshot: every leaf path containing `query`. */
export function searchPaths(obj: unknown, query: string, limit = 100): PathMatch[] {
  const q = query.toLowerCase();
  const out: PathMatch[] = [];
  const walk = (value: unknown, path: string) => {
    if (out.length >= limit) return;
    if (typeof value === 'object' && value !== null) {
      const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value);
      for (const [k, v] of entries) walk(v, `${path}/${k}`);
      return;
    }
    if (path.toLowerCase().includes(q)) out.push({ path, value });
  };
  walk(obj, '');
  return out;
}

export interface StateChange {
  path: string;
  from: unknown;
  to: unknown;
}

/**
 * Leaf-level diff between two state snapshots — the inspector's mutation
 * log. Recurses through plain objects; arrays are treated as leaves (a
 * ticking data feed replaces whole arrays every update, and row-by-row
 * diffs of 1000-bar feeds would drown the signal), reported as a summary
 * change when their contents differ. Capped so a huge write can't wedge
 * the panel.
 */
export function diffSnapshots(prev: unknown, next: unknown, limit = 30): StateChange[] {
  const out: StateChange[] = [];
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);
  const walk = (a: unknown, b: unknown, path: string) => {
    if (out.length >= limit) return;
    if (a === b) return;
    if (isRecord(a) && isRecord(b)) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
        walk(a[key], b[key], `${path}/${key}`);
      }
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        out.push({ path, from: `[${a.length} items]`, to: `[${b.length} items]` });
      }
      return;
    }
    out.push({ path, from: a, to: b });
  };
  walk(prev, next, '');
  return out;
}
