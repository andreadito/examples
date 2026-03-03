import { useState, useEffect, useRef } from 'react';
import type { SelectOption, OptionsSource } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type OptionsProvider = () => Promise<SelectOption[]>;

export type OptionsProviders = Record<string, OptionsProvider>;

export interface FieldOptionsState {
  options: SelectOption[];
  loading: boolean;
  error?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Resolves options for a field. If `optionsSource` is provided and a matching
 * provider exists, fetches options asynchronously. Otherwise falls back to
 * the static `options` array from the schema.
 */
export function useFieldOptions(
  staticOptions: SelectOption[] | undefined,
  optionsSource: OptionsSource | undefined,
  providers: OptionsProviders | undefined,
): FieldOptionsState {
  const [state, setState] = useState<FieldOptionsState>(() => ({
    options: staticOptions ?? [],
    loading: !!optionsSource,
  }));

  const providerRef = useRef(providers);
  providerRef.current = providers;

  useEffect(() => {
    if (!optionsSource) return;

    const provider = providerRef.current?.[optionsSource.provider];
    if (!provider) {
      setState({
        options: staticOptions ?? [],
        loading: false,
        error: `Options provider "${optionsSource.provider}" not found`,
      });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    provider()
      .then((result) => {
        if (!cancelled) {
          setState({ options: result, loading: false });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            options: staticOptions ?? [],
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load options',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [optionsSource, staticOptions]);

  return state;
}
