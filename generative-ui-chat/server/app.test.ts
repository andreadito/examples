import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

const fakeResponse = { id: 'msg_1', content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn' };

function makeClient() {
  return { messages: { create: vi.fn().mockResolvedValue(fakeResponse) } };
}

describe('POST /api/claude', () => {
  it('forwards system/messages/tools and returns the raw response', async () => {
    const client = makeClient();
    const res = await request(createApp(client))
      .post('/api/claude')
      .send({ system: 'sys', messages: [{ role: 'user', content: 'hello' }], tools: [{ name: 'render_ui' }] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeResponse);
    const body = client.messages.create.mock.calls[0][0];
    expect(body.system).toBe('sys');
    expect(body.tools).toEqual([{ name: 'render_ui' }]);
  });

  it('pins the model server-side and ignores client model', async () => {
    const client = makeClient();
    await request(createApp(client))
      .post('/api/claude')
      .send({ model: 'claude-haiku-4-5', messages: [{ role: 'user', content: 'x' }] });
    expect(client.messages.create.mock.calls[0][0].model).toBe('claude-opus-4-8');
  });

  it('caps max_tokens at 16000', async () => {
    const client = makeClient();
    await request(createApp(client))
      .post('/api/claude')
      .send({ max_tokens: 999999, messages: [{ role: 'user', content: 'x' }] });
    expect(client.messages.create.mock.calls[0][0].max_tokens).toBe(16000);
  });

  it('rejects requests without messages', async () => {
    const res = await request(createApp(makeClient())).post('/api/claude').send({});
    expect(res.status).toBe(400);
  });

  it('maps upstream API errors to their status', async () => {
    const client = makeClient();
    client.messages.create.mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }));
    const res = await request(createApp(client))
      .post('/api/claude')
      .send({ messages: [{ role: 'user', content: 'x' }] });
    expect(res.status).toBe(429);
    expect(res.body.error).toContain('rate limited');
  });
});
