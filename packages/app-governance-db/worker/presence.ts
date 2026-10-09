/** Best-effort live feed; the D1 audit log remains the canonical record. */
export class PresenceHub {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const recent = (await this.state.storage.get<unknown[]>('recent')) ?? [];
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      // Runtime-owned sockets survive hibernation. No timers or event listeners
      // may keep this otherwise idle object resident.
      this.state.acceptWebSocket(server);
      server.send(JSON.stringify({ type: 'hello', recent }));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.method === 'POST' && url.pathname.endsWith('/publish')) {
      const event = await request.json();
      // Persist before fan-out, and serialize concurrent publishers without
      // relying on an in-memory cache that disappears during hibernation.
      await this.state.storage.transaction(async (txn) => {
        const recent = (await txn.get<unknown[]>('recent')) ?? [];
        await txn.put('recent', [...recent, event].slice(-50));
      });
      const message = JSON.stringify({ type: 'event', ...(event as Record<string, unknown>) });
      let subscribers = 0;
      for (const ws of this.state.getWebSockets()) {
        if (ws.readyState !== WebSocket.OPEN) continue;
        try {
          ws.send(message);
          subscribers++;
        } catch {
          this.webSocketError(ws);
        }
      }
      return Response.json({ ok: true, subscribers });
    }
    return new Response('Not found', { status: 404 });
  }

  // Clients only subscribe. Preserve the existing behavior of ignoring input.
  webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): void {}

  webSocketClose(ws: WebSocket, code: number, reason: string): void {
    // Explicitly finish the close handshake for the existing compatibility date.
    try { ws.close(code === 1005 ? 1000 : code, reason); } catch { /* Already closed. */ }
  }

  webSocketError(ws: WebSocket): void {
    try { ws.close(1011, 'WebSocket error'); } catch { /* Already closed. */ }
  }
}
