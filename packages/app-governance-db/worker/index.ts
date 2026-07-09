import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';

import { misconfiguredResponse, resolveOperator } from '../src/auth.js';
import { registerTools } from '../src/tools.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  PRESENCE: DurableObjectNamespace;
  DB: D1Database;
  MCP_API_KEY?: string;
}

type Props = { operator?: string };

/**
 * Presence hub: one Durable Object instance fans every governance write out to
 * connected WebSocket clients, so operators can watch multiple agents work the
 * database live. Best-effort; the audit log in D1 remains the record.
 */
export class PresenceHub {
  private sockets = new Set<WebSocket>();
  private recent: unknown[] = [];

  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      server.accept();
      this.sockets.add(server);
      server.send(JSON.stringify({ type: 'hello', recent: this.recent }));
      server.addEventListener('close', () => this.sockets.delete(server));
      server.addEventListener('error', () => this.sockets.delete(server));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.method === 'POST' && url.pathname.endsWith('/publish')) {
      const event = await request.json();
      this.recent.push(event);
      if (this.recent.length > 50) this.recent.shift();
      const message = JSON.stringify({ type: 'event', ...(event as Record<string, unknown>) });
      for (const ws of this.sockets) {
        try {
          ws.send(message);
        } catch {
          this.sockets.delete(ws);
        }
      }
      return new Response(JSON.stringify({ ok: true, subscribers: this.sockets.size }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }
}

export class AppGovernanceMCP extends McpAgent<Env> {
  server = new McpServer({
  name: 'app-governance-db',
  version: '1.8.11',
  }) as unknown as McpAgent<Env>['server'];

  async init() {
    const operator = (this as unknown as { props?: Props }).props?.operator ?? 'unknown';
    const hub = () => this.env.PRESENCE.get(this.env.PRESENCE.idFromName('hub'));
    const publish = (event: Record<string, unknown>) => {
      void hub()
        .fetch('https://presence/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operator, ...event }),
        })
        .catch(() => {});
    };
    publish({ ts: new Date().toISOString(), actor: operator, action: 'session_connected', entity_type: 'session', entity_id: null });
    registerTools(this.server as unknown as McpServer, () => this.env.DB, publish);
  }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id',
};

const LIVE_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>app-governance · live</title>
<style>
  body { margin: 0; background: #000; color: rgba(255,255,255,.87); font: 13px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
  header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,.12); display: flex; gap: 12px; align-items: baseline; }
  h1 { font-size: 13px; margin: 0; font-weight: 600; letter-spacing: .04em; }
  #status { color: rgba(255,255,255,.46); }
  #status.live { color: #7bd88f; }
  ol { list-style: none; margin: 0; padding: 8px 0; }
  li { padding: 6px 20px; border-bottom: 1px solid rgba(255,255,255,.06); display: flex; gap: 14px; }
  .ts { color: rgba(255,255,255,.35); min-width: 70px; }
  .op { color: #7aa2f7; min-width: 90px; }
  .action { color: rgba(255,255,255,.87); min-width: 160px; }
  .entity { color: rgba(255,255,255,.46); }
</style></head><body>
<header><h1>app-governance — live collaboration</h1><span id="status">connecting…</span></header>
<ol id="feed"></ol>
<script>
  const feed = document.getElementById('feed');
  const status = document.getElementById('status');
  function row(e) {
    const li = document.createElement('li');
    const t = (e.ts || '').slice(11, 19);
    li.innerHTML = '<span class="ts">' + t + '</span><span class="op">' + (e.operator || '—') +
      '</span><span class="action">' + (e.action || '') + '</span><span class="entity">' +
      (e.entity_type || '') + (e.entity_id ? ' #' + e.entity_id : '') +
      (e.actor && e.actor !== e.operator ? ' · ' + e.actor : '') + '</span>';
    feed.prepend(li);
    while (feed.children.length > 200) feed.removeChild(feed.lastChild);
  }
  function connect() {
    const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/presence' + location.search);
    ws.onopen = () => { status.textContent = 'live'; status.className = 'live'; };
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.type === 'hello') { (d.recent || []).forEach(row); return; }
      row(d);
    };
    ws.onclose = () => { status.textContent = 'reconnecting…'; status.className = ''; setTimeout(connect, 3000); };
  }
  connect();
</script></body></html>`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const needsAuth =
      url.pathname === '/mcp' || url.pathname.startsWith('/mcp/') ||
      url.pathname === '/sse' || url.pathname.startsWith('/sse/') ||
      url.pathname === '/presence' || url.pathname === '/live';

    let operator = 'unknown';
    if (needsAuth) {
      const resolved = await resolveOperator(request, env);
      if (resolved instanceof Response) return resolved;
      operator = resolved.operator;
    }

    if (url.pathname === '/presence') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426, headers: CORS_HEADERS });
      }
      return env.PRESENCE.get(env.PRESENCE.idFromName('hub')).fetch(request);
    }

    if (url.pathname === '/live') {
      return new Response(LIVE_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      (ctx as { props?: Props }).props = { operator };
      return AppGovernanceMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      (ctx as { props?: Props }).props = { operator };
      return AppGovernanceMCP.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      if (!env.MCP_API_KEY) return misconfiguredResponse('MCP_API_KEY is not configured.');
      return new Response(
        JSON.stringify(
          {
            name: 'app-governance-db',
            version: '1.8.11',
            description:
              'App Governance & Transparency database layer — D1-canonical findings, Slack-synced items, categorization, notifications, audit. Atlas-backed.',
            auth: {
              mode: 'Bearer required (shared key or per-operator keys)',
              header: 'Authorization: Bearer <key> (or ?key= for /presence and /live)',
            },
            endpoints: {
              mcp: '/mcp',
              sse: '/sse',
              presence: '/presence (WebSocket)',
              live: '/live (browser view)',
            },
            context: {
              tracker_canvas: 'F0BB96552KG',
              triage_channel: 'C05KPSPTPFT',
              airtable_projection: 'app1Q0o9xw2Zny7gw',
            },
          },
          null,
          2,
        ),
        { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      );
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};
