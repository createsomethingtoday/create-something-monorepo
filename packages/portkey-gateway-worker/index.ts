/**
 * Portkey Gateway Worker Wrapper
 *
 * Thin Cloudflare Worker wrapper around a pinned Portkey OSS gateway deployment.
 * It keeps the runtime contract stable for CREATE SOMETHING control-plane routing.
 *
 * Endpoints:
 *   - POST /v1/responses
 *   - POST /v1/chat/completions
 *   - GET  /v1/models
 *   - GET  /health
 */

interface Env {
  PORTKEY_UPSTREAM_URL: string;
  PORTKEY_UPSTREAM_API_KEY?: string;
}

const ALLOWED_PATHS = new Set<string>([
  '/v1/responses',
  '/v1/chat/completions',
  '/v1/models',
]);

function json(status: number, payload: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });
}

function sanitizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

function forwardHeaders(request: Request, env: Env): Headers {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  if (env.PORTKEY_UPSTREAM_API_KEY && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${env.PORTKEY_UPSTREAM_API_KEY}`);
  }

  return headers;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json(200, {
        ok: true,
        service: 'portkey-gateway-worker',
        upstreamConfigured: Boolean(env.PORTKEY_UPSTREAM_URL),
        timestamp: new Date().toISOString(),
      });
    }

    if (!ALLOWED_PATHS.has(url.pathname)) {
      return json(404, {
        error: 'Not found',
        allowed: Array.from(ALLOWED_PATHS),
      });
    }

    if (!env.PORTKEY_UPSTREAM_URL) {
      return json(503, {
        error: 'PORTKEY_UPSTREAM_URL is not configured',
      });
    }

    const upstreamUrl = `${sanitizeBaseUrl(env.PORTKEY_UPSTREAM_URL)}${url.pathname}${url.search}`;

    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers: forwardHeaders(request, env),
      body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('x-cs-gateway-wrapper', 'portkey-gateway-worker');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  },
};
