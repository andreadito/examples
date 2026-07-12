import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generate } from './generate';
import { buildCatalog } from '../catalog/buildCatalog';
import { createStrictValidator, mergedDefinitions } from './strictValidate';

const catalog = buildCatalog();
const validate = createStrictValidator(catalog, mergedDefinitions());

// `visible: true` (not omitted, not `null`) from the start: `normalizeSpec`
// only rewrites an absent/null `visible`, so these test specs already match
// what `generate()` will return as `result.spec` after normalization — see
// normalizeSpec.ts and strictValidate.ts for why `true` (not `null`/`undefined`)
// is the only value that's both valid and render-safe.
const goodSpec = {
  root: 's',
  elements: { s: { type: 'Typography', props: { text: 'hello', variant: null, color: null, sx: null }, children: [], visible: true } },
};
const badSpec = { root: 'x', elements: { x: { type: 'NotAComponent', props: {}, children: [], visible: true } } };

function claudeResponse(content: unknown[], stop_reason = 'end_turn') {
  return { ok: true, json: async () => ({ content, stop_reason }) };
}

const baseArgs = {
  endpoint: '/api/claude',
  catalog,
  validate,
  history: [],
  prompt: 'build a thing',
  currentSpec: null,
  dataInfo: 'positions: array(3)',
};

describe('generate', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('returns text + validated spec from a tool call', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      claudeResponse([
        { type: 'text', text: 'Here is your dashboard' },
        { type: 'tool_use', id: 'tu_1', name: 'render_ui', input: goodSpec },
      ]),
    );
    const result = await generate(baseArgs);
    expect(result.text).toContain('dashboard');
    expect(result.spec).toEqual(goodSpec);
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.tools[0].name).toBe('render_ui');
    expect(body.system).toContain('Typography');
  });

  it('text-only response returns spec null', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(claudeResponse([{ type: 'text', text: 'I cannot build that, but I could…' }]));
    const result = await generate(baseArgs);
    expect(result.spec).toBeNull();
  });

  it('repairs an invalid spec once via tool_result and succeeds', async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(claudeResponse([{ type: 'tool_use', id: 'tu_1', name: 'render_ui', input: badSpec }]))
      .mockResolvedValueOnce(claudeResponse([{ type: 'tool_use', id: 'tu_2', name: 'render_ui', input: goodSpec }]));
    const result = await generate(baseArgs);
    expect(result.spec).toEqual(goodSpec);
    expect(fetch).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body);
    const lastMsg = secondBody.messages.at(-1);
    expect(lastMsg.role).toBe('user');
    expect(lastMsg.content[0].type).toBe('tool_result');
    expect(lastMsg.content[0].tool_use_id).toBe('tu_1');
    expect(lastMsg.content[0].is_error).toBe(true);
  });

  it('throws after two invalid specs', async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(claudeResponse([{ type: 'tool_use', id: 'tu_1', name: 'render_ui', input: badSpec }]))
      .mockResolvedValueOnce(claudeResponse([{ type: 'tool_use', id: 'tu_2', name: 'render_ui', input: badSpec }]));
    await expect(generate(baseArgs)).rejects.toThrow(/validation/i);
  });

  it('includes currentSpec in the user prompt for edits', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(claudeResponse([{ type: 'text', text: 'ok' }]));
    await generate({ ...baseArgs, currentSpec: goodSpec });
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(JSON.stringify(body.messages.at(-1))).toContain('Current spec');
  });

  it('maps refusal stop_reason to a friendly message', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(claudeResponse([], 'refusal'));
    const result = await generate(baseArgs);
    expect(result.spec).toBeNull();
    expect(result.text.toLowerCase()).toContain('declined');
  });

  it('throws on non-OK HTTP with server error message', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'rate limited' }) });
    await expect(generate(baseArgs)).rejects.toThrow(/rate limited/);
  });

  it('a tool_use-only response (no text block) resolves with empty text and does not throw', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      claudeResponse([{ type: 'tool_use', id: 'tu_1', name: 'render_ui', input: goodSpec }]),
    );
    const result = await generate(baseArgs);
    expect(result.text).toBe('');
    expect(result.spec).toEqual(goodSpec);
  });

  it('substitutes a placeholder for an empty-text history turn instead of sending an empty content block', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(claudeResponse([{ type: 'text', text: 'ok' }]));
    await generate({
      ...baseArgs,
      history: [
        { role: 'user', text: 'earlier prompt' },
        { role: 'assistant', text: '' }, // e.g. a stored render_ui-only turn
      ],
    });
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const historyAssistantMessage = body.messages[1];
    expect(historyAssistantMessage.role).toBe('assistant');
    expect(historyAssistantMessage.content).not.toBe('');
    expect(typeof historyAssistantMessage.content).toBe('string');
    expect(historyAssistantMessage.content.length).toBeGreaterThan(0);
  });
});
