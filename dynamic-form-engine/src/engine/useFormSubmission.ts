import { useState, useCallback, useRef } from 'react';
import type { SubmissionConfig, SubmissionState, FormCallbacks } from '../types';

interface SubmissionOptions<TResponse> {
  /** Custom submit handler — overrides URL-based fetch when provided */
  submitHandler?: (values: Record<string, unknown>) => Promise<TResponse>;
  /** Transform the form values before submission */
  transformPayload?: (values: Record<string, unknown>) => unknown;
}

export function useFormSubmission<TResponse = unknown>(
  config: SubmissionConfig,
  callbacks?: FormCallbacks<TResponse>,
  options?: SubmissionOptions<TResponse>,
) {
  const [state, setState] = useState<SubmissionState<TResponse>>({ status: 'idle' });
  const configRef = useRef(config);
  const callbacksRef = useRef(callbacks);
  const optionsRef = useRef(options);
  configRef.current = config;
  callbacksRef.current = callbacks;
  optionsRef.current = options;

  const submit = useCallback(async (values: Record<string, unknown>) => {
    const cfg = configRef.current;
    const cbs = callbacksRef.current;
    const opts = optionsRef.current;

    setState({ status: 'submitting' });
    cbs?.onSubmitting?.(values);

    try {
      const payload = opts?.transformPayload
        ? opts.transformPayload(values)
        : values;

      let response: unknown;

      if (opts?.submitHandler) {
        response = await opts.submitHandler(payload as Record<string, unknown>);
      } else {
        const controller = new AbortController();
        const timeoutId = cfg.timeout
          ? setTimeout(() => controller.abort(), cfg.timeout)
          : undefined;

        try {
          const res = await fetch(cfg.url, {
            method: cfg.method ?? 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...cfg.headers,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }

          response = await res.json();
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      }

      const typedResponse = response as TResponse;
      setState({ status: 'success', response: typedResponse });
      cbs?.onSuccess?.(typedResponse, values);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ status: 'error', error });
      cbs?.onError?.(error, values);
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, submit, reset };
}
