import { WebSocketServer } from 'ws';
import type { Server } from 'node:http';
import { handleWsMessage } from './demoData.ts';

/**
 * Attach a WebSocket demo server to the existing HTTP server.
 * Handles request-response: client sends a JSON message with `{ action }`,
 * server dispatches to the appropriate data generator and sends the response.
 */
export function attachWebSocketServer(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    ws.on('message', async (raw) => {
      const msg = raw.toString();
      try {
        const parsed = JSON.parse(msg);
        console.log(`[WS] ← ${parsed.action ?? 'unknown action'}`);
      } catch {
        console.log('[WS] ← (non-JSON message)');
      }

      try {
        const response = await handleWsMessage(msg);
        ws.send(response);
      } catch (err) {
        ws.send(JSON.stringify({ error: String(err) }));
      }
    });

    ws.on('error', (err) => {
      console.error('[WS] Connection error:', err.message);
    });
  });

  console.log('WebSocket demo server attached');
}
