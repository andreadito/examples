import express from 'express';
import cors from 'cors';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const MAX_TOKENS_CAP = 16000;

export interface ClaudeClient {
  messages: { create(body: Record<string, unknown>): Promise<unknown> };
}

export function createApp(client: ClaudeClient) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/claude', async (req, res) => {
    const { system, messages, tools, tool_choice, max_tokens } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages (non-empty array) is required' });
      return;
    }
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: Math.min(Number(max_tokens) || MAX_TOKENS_CAP, MAX_TOKENS_CAP),
        thinking: { type: 'adaptive' },
        ...(system ? { system } : {}),
        messages,
        ...(tools ? { tools } : {}),
        ...(tool_choice ? { tool_choice } : {}),
      });
      res.json(response);
    } catch (err) {
      const status = typeof (err as { status?: number }).status === 'number' ? (err as { status: number }).status : 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Upstream error' });
    }
  });

  return app;
}
