import { normalizeSpec } from './normalizeSpec';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

/** Structural subset of a built catalog `generate()` needs for prompt assembly. */
export interface GenerateCatalog {
  jsonSchema(): object;
  prompt(options?: object): string;
}

export interface GenerateArgs {
  endpoint: string; // '/api/claude'
  catalog: GenerateCatalog;
  /**
   * Strict per-component validator (see `createStrictValidator` in
   * `strictValidate.ts`) — NOT `catalog.validate` directly. `catalog.validate()`
   * alone only enforces the spec envelope for multi-component catalogs (see
   * catalog/definitions.ts "Library findings"); the repair loop needs
   * per-prop errors to give the model something actionable to fix.
   */
  validate: (spec: unknown) => { success: boolean; errors: string[] };
  history: ChatTurn[];
  prompt: string;
  currentSpec: object | null;
  dataInfo: string; // describeData() output
  signal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  spec: object | null;
}

interface ProxyMessage {
  role: 'user' | 'assistant';
  content: unknown;
}

interface ProxyResponse {
  content: Array<Record<string, unknown>>;
  stop_reason: string;
}

const REFUSAL_MESSAGE = "The request was declined by the model's safety system. Try rephrasing.";

/**
 * Placeholder assistant turn text used whenever Claude's response has no text
 * block (a render_ui-only tool call, most commonly). An empty string here
 * would round-trip as an empty assistant `content` on the *next* turn once
 * appended to history, which the Anthropic API rejects with a 400 — so both
 * the chat display (`GenerativeUIChat.tsx`) and `buildMessages` below
 * substitute this same fallback rather than ever storing/sending `''`.
 */
export const FALLBACK_ASSISTANT_TEXT = 'Done — rendered on the canvas.';

async function callProxy(endpoint: string, body: object, signal?: AbortSignal): Promise<ProxyResponse> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<ProxyResponse>;
}

function buildSystemPrompt(catalog: GenerateCatalog, dataInfo: string): string {
  const customRules = [
    'Never emit JSON or JSONL in chat text — all UI output must go through the render_ui tool.',
    'To create or update the UI, call the render_ui tool with the COMPLETE spec (never a partial diff).',
    `Bind live data via $state expressions under /data. Live data shape:\n${dataInfo}`,
    'ALWAYS include "visible": true on every element unless you specifically intend conditional visibility.',
    "If a request can't be built from the available catalog, say so in the chat text and offer the nearest thing you CAN build instead.",
  ];
  return catalog.prompt({ customRules });
}

function buildTools(catalog: GenerateCatalog) {
  return [
    {
      name: 'render_ui',
      description: 'Render or replace the UI on the canvas. Input is the complete UI spec.',
      input_schema: catalog.jsonSchema(),
    },
  ];
}

function buildMessages(history: ChatTurn[], prompt: string, currentSpec: object | null): ProxyMessage[] {
  // Defensive: a history turn with empty text (e.g. an old assistant turn
  // that predates the GenerativeUIChat.tsx fallback fix, or a caller-supplied
  // history) must never become an empty `content` string on the wire — the
  // Anthropic API 400s on that. Substitute the same placeholder used for
  // empty tool-call-only responses rather than dropping the turn, so
  // user/assistant alternation in `history` is preserved.
  const messages: ProxyMessage[] = history.map((turn) => ({ role: turn.role, content: turn.text || FALLBACK_ASSISTANT_TEXT }));
  const userText = currentSpec
    ? `${prompt}\n\nCurrent spec:\n${JSON.stringify(currentSpec)}\nEdit it and call render_ui with the complete updated spec.`
    : prompt;
  messages.push({ role: 'user', content: userText });
  return messages;
}

function textOf(content: Array<Record<string, unknown>>): string {
  return content
    .filter((block) => block.type === 'text')
    .map((block) => (block.text as string) ?? '')
    .join('');
}

function findRenderUiCall(content: Array<Record<string, unknown>>): { id: string; input: unknown } | null {
  const block = content.find((b) => b.type === 'tool_use' && b.name === 'render_ui');
  if (!block) return null;
  return { id: block.id as string, input: block.input };
}

type ParsedResponse =
  | { kind: 'refusal'; text: string }
  | { kind: 'text-only'; text: string }
  | { kind: 'tool-use'; text: string; toolUseId: string; input: unknown };

function parseResponse(response: ProxyResponse): ParsedResponse {
  if (response.stop_reason === 'refusal') {
    return { kind: 'refusal', text: REFUSAL_MESSAGE };
  }
  const text = textOf(response.content);
  const toolUse = findRenderUiCall(response.content);
  if (!toolUse) {
    return { kind: 'text-only', text };
  }
  return { kind: 'tool-use', text, toolUseId: toolUse.id, input: toolUse.input };
}

/**
 * Browser-side generation loop: build the system prompt + tool schema from
 * the catalog, call the (key-masking) proxy, and validate any `render_ui`
 * tool call before returning it. On a validation failure, do exactly one
 * repair round-trip (feed the model a `tool_result` with `is_error: true`
 * and the readable error list) before giving up.
 */
export async function generate(args: GenerateArgs): Promise<GenerateResult> {
  const { endpoint, catalog, validate, history, prompt, currentSpec, dataInfo, signal } = args;

  const system = buildSystemPrompt(catalog, dataInfo);
  const tools = buildTools(catalog);
  const messages = buildMessages(history, prompt, currentSpec);

  let lastErrors: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await callProxy(endpoint, { system, messages, tools }, signal);
    const parsed = parseResponse(response);

    if (parsed.kind !== 'tool-use') {
      return { text: parsed.text, spec: null };
    }

    const normalizedSpec = normalizeSpec(parsed.input);
    const validation = validate(normalizedSpec);
    if (validation.success) {
      return { text: parsed.text, spec: normalizedSpec as object };
    }

    lastErrors = validation.errors;
    if (attempt === 0) {
      const errorText = `${validation.errors.join('\n')}\nCall render_ui again with a corrected complete spec.`;
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: parsed.toolUseId, is_error: true, content: errorText }],
      });
    }
  }

  throw new Error(`Generated UI failed validation twice: ${lastErrors.join('; ')}`);
}
