import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * User-supplied data sources for the demo: any JSON that is an array of
 * objects or a single object with fields, pasted inline or fetched from a
 * URL. Each source becomes a top-level key in the `data` prop passed to
 * GenerativeUIChat, right beside the built-in desks — the component itself
 * needs no changes to consume them.
 */

export interface CustomSource {
  name: string;
  mode: 'json' | 'url';
  /** Raw JSON text (mode 'json'). */
  text?: string;
  /** Endpoint returning JSON (mode 'url'). */
  url?: string;
  /** Re-fetch cadence in seconds (mode 'url'); 0/undefined = fetch once. */
  refreshSec?: number;
}

export type SourceValue = Record<string, unknown> | Array<Record<string, unknown>>;

/** Keys owned by the built-in ticker feed — custom sources must not shadow them. */
export const RESERVED_KEYS = ['positions', 'ohlc', 'book', 'news', 'fx', 'rates', 'credit', 'asOf', 'totalPnl'];

const STORAGE_KEY = 'generative-ui-demo/custom-sources';

export function validateName(name: string, existing: string[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required.';
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmed)) return 'Use a simple identifier (letters, digits, underscores).';
  if (RESERVED_KEYS.includes(trimmed)) return `"${trimmed}" is a built-in feed — pick another name.`;
  if (existing.includes(trimmed)) return `A source named "${trimmed}" already exists.`;
  return null;
}

/** Parse + shape-check a source payload: array of objects, or one object. */
export function parseSourceValue(raw: string): SourceValue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Not valid JSON.');
  }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return [];
    if (!parsed.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))) {
      throw new Error('Arrays must contain objects (rows).');
    }
    return parsed as Array<Record<string, unknown>>;
  }
  if (typeof parsed === 'object' && parsed !== null) {
    return parsed as Record<string, unknown>;
  }
  throw new Error('Must be an array of objects or a single object.');
}

function loadStored(): CustomSource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CustomSource[]) : [];
  } catch {
    return [];
  }
}

/**
 * Manage custom sources (persisted to localStorage) and resolve their live
 * values: inline JSON parses synchronously; URL sources fetch on add and
 * optionally on an interval.
 */
export function useCustomSources() {
  const [sources, setSources] = useState<CustomSource[]>(loadStored);
  const [urlValues, setUrlValues] = useState<Record<string, SourceValue>>({});
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    } catch {
      /* storage full/unavailable — sources stay in-memory */
    }
  }, [sources]);

  // URL sources: fetch now, then on the requested cadence.
  useEffect(() => {
    const timers = timersRef.current;
    for (const timer of Object.values(timers)) clearInterval(timer);
    timersRef.current = {};

    for (const source of sources) {
      if (source.mode !== 'url' || !source.url) continue;
      const load = async () => {
        try {
          const res = await fetch(source.url as string);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const value = parseSourceValue(await res.text());
          setUrlValues((prev) => ({ ...prev, [source.name]: value }));
          setUrlErrors((prev) => {
            const { [source.name]: _dropped, ...rest } = prev;
            return rest;
          });
        } catch (err) {
          setUrlErrors((prev) => ({ ...prev, [source.name]: err instanceof Error ? err.message : String(err) }));
        }
      };
      void load();
      if (source.refreshSec && source.refreshSec > 0) {
        timersRef.current[source.name] = setInterval(load, source.refreshSec * 1000);
      }
    }
    return () => {
      for (const timer of Object.values(timersRef.current)) clearInterval(timer);
      timersRef.current = {};
    };
  }, [sources]);

  const addSource = useCallback((source: CustomSource) => {
    setSources((prev) => [...prev, source]);
  }, []);

  const removeSource = useCallback((name: string) => {
    setSources((prev) => prev.filter((s) => s.name !== name));
    setUrlValues((prev) => {
      const { [name]: _dropped, ...rest } = prev;
      return rest;
    });
  }, []);

  /** Resolved values keyed by source name, ready to spread into `data`. */
  const values = useMemo(() => {
    const out: Record<string, SourceValue> = {};
    for (const source of sources) {
      if (source.mode === 'json' && source.text) {
        try {
          out[source.name] = parseSourceValue(source.text);
        } catch {
          /* invalid stored text — skip */
        }
      } else if (source.mode === 'url' && urlValues[source.name] !== undefined) {
        out[source.name] = urlValues[source.name];
      }
    }
    return out;
  }, [sources, urlValues]);

  return { sources, values, urlErrors, addSource, removeSource };
}
