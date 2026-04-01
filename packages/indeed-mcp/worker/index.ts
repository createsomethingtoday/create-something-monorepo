import { createServer, handleApplyWebhook, renderIndeedApplyFeed } from '../src/index.js';
import { getConfiguredMcpKey, getMcpMisconfiguredPayload } from '../src/http.js';
import { getQuestionsDocument, listJobs } from '../src/storage.js';
import type { IndeedEnv } from '../src/types.js';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-API-Key, X-Indeed-Signature',
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function xml(body: string, init: ResponseInit = {}): Response {
  return new Response(body, {
    ...init,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers ?? {}),
    },
  });
}

export default {
  async fetch(request: Request, env: IndeedEnv): Promise<Response> {
    const url = new URL(request.url);
    const server = createServer();
    const accountId = env.INDEED_ACCOUNT_ID?.trim() || 'abundance';
    const publicBaseUrl = env.INDEED_APPLY_BASE_URL?.trim() || `${url.protocol}//${url.host}`;
    const configuredMcpKey = getConfiguredMcpKey(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        name: 'indeed-mcp',
        version: '0.1.0',
        endpoints: {
          mcp: '/mcp',
          feed: '/feeds/indeed-apply.xml',
          questions: '/questions/:local_job_id.json',
          webhook: '/webhooks/apply',
          health: '/health',
        },
        configured: {
          db: Boolean(env.DB),
          storage: Boolean(env.STORAGE),
          indeedApplyClientId: Boolean(env.INDEED_APPLY_CLIENT_ID),
          indeedApplySecret: Boolean(env.INDEED_APPLY_SECRET),
          mcpApiKey: Boolean(configuredMcpKey),
          publicBaseUrl,
        },
      });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!configuredMcpKey) {
        return json(getMcpMisconfiguredPayload(), { status: 503 });
      }

      return withCors(await server.handleRequest(request, env));
    }

    if (url.pathname === '/webhooks/apply') {
      return withCors(await handleApplyWebhook(request, env));
    }

    if (url.pathname === '/feeds/indeed-apply.xml') {
      if (!env.DB || !env.INDEED_APPLY_CLIENT_ID) {
        return xml('<error>Feed not configured.</error>', { status: 500 });
      }

      const jobs = await listJobs(env.DB, accountId, { includeDrafts: false });
      const body = renderIndeedApplyFeed(jobs, {
        apiToken: env.INDEED_APPLY_CLIENT_ID,
        publisher: env.INDEED_FEED_PUBLISHER?.trim() || 'CREATE SOMETHING',
        publisherUrl: env.INDEED_FEED_PUBLISHER_URL?.trim() || 'https://createsomething.agency',
        publicBaseUrl,
      });

      return xml(body);
    }

    if (url.pathname.startsWith('/questions/')) {
      if (!env.DB) {
        return json({ error: 'DB binding is required.' }, { status: 500 });
      }

      const localJobId = decodeURIComponent(url.pathname.replace(/^\/questions\/|\.json$/g, ''));
      const document = await getQuestionsDocument(env.DB, accountId, localJobId);
      if (!document) {
        return json({ error: 'Questions not found.', local_job_id: localJobId }, { status: 404 });
      }

      return new Response(document, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    return json(
      { error: 'Not found. Supported endpoints: /mcp, /feeds/indeed-apply.xml, /questions/:id.json, /webhooks/apply, /health.' },
      { status: 404 },
    );
  },
};
