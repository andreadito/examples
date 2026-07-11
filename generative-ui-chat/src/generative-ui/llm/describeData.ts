function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function sampleValue(value: unknown): unknown {
  if (typeof value === 'number') return round(value);
  if (Array.isArray(value)) return value.slice(0, 1).map(sampleValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sampleValue(val);
    }
    return out;
  }
  return value;
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function fieldTypesOf(row: Record<string, unknown>): string {
  return Object.entries(row)
    .map(([key, value]) => `${key}: ${typeOf(value)}`)
    .join(', ');
}

function describeArray(path: string, arr: unknown[]): string[] {
  const lines = [`${path}: array, ${arr.length} rows`];
  if (arr.length === 0) return lines;
  const [first] = arr;
  if (first && typeof first === 'object' && !Array.isArray(first)) {
    lines.push(`  fields: ${fieldTypesOf(first as Record<string, unknown>)}`);
  }
  lines.push(`  sample: ${JSON.stringify(sampleValue(first))}`);
  return lines;
}

function describeValue(path: string, value: unknown): string[] {
  if (Array.isArray(value)) {
    return describeArray(path, value);
  }
  if (value && typeof value === 'object') {
    const lines = [`${path}: record`];
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      lines.push(...describeValue(`${path}/${key}`, val));
    }
    return lines;
  }
  return [`${path}: ${typeOf(value)} = ${JSON.stringify(value)}`];
}

/**
 * Produce a compact, human/LLM-readable summary of the live data model so it
 * can be embedded in the system prompt: for every top-level key, its kind
 * (array vs. record), row count, field names + inferred types, and a single
 * sample row (numbers rounded to 2dp, arrays truncated to one sample item —
 * we never want to blow up the prompt with the full dataset).
 */
export function describeData(data: unknown, dataDescription?: string): string {
  const lines: string[] = [];
  if (dataDescription) lines.push(dataDescription);
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      lines.push(...describeValue(`/data/${key}`, value));
    }
  } else {
    lines.push(...describeValue('/data', data));
  }
  return lines.join('\n');
}
