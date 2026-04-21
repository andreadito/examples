export function parseJsonc<T = unknown>(text: string): T {
  return JSON.parse(stripComments(text)) as T;
}

export function stripComments(text: string): string {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i]!;
    const next = text[i + 1];
    if (c === '"') {
      const end = findStringEnd(text, i);
      out += text.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if (c === '/' && next === '/') {
      const nl = text.indexOf('\n', i);
      if (nl === -1) return out;
      i = nl;
      continue;
    }
    if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end === -1) return out;
      i = end + 2;
      continue;
    }
    out += c;
    i++;
  }
  return stripTrailingCommas(out);
}

function findStringEnd(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length) {
    const c = text[i]!;
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === '"') return i;
    i++;
  }
  return text.length - 1;
}

function stripTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, '$1');
}
