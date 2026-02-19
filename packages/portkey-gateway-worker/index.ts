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

interface PortkeyTarget {
  provider: string;
  api_key: string;
  base_url?: string;
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

function parseTargetFromPortkeyConfig(request: Request): PortkeyTarget | null {
  const raw = request.headers.get('x-portkey-config');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { targets?: Array<Record<string, unknown>> };
    const target = parsed.targets?.[0];
    if (!target) return null;
    const provider = typeof target.provider === 'string' ? target.provider.trim().toLowerCase() : '';
    const apiKey = typeof target.api_key === 'string' ? target.api_key.trim() : '';
    const baseUrl = typeof target.base_url === 'string' ? target.base_url.trim() : undefined;
    if (!provider || !apiKey) return null;
    return { provider, api_key: apiKey, base_url: baseUrl };
  } catch {
    return null;
  }
}

function resolveDirectProviderBaseUrl(target: PortkeyTarget): string | null {
  if (target.base_url) return sanitizeBaseUrl(target.base_url);
  if (target.provider === 'openai') return 'https://api.openai.com';
  return null;
}

function directHeaders(request: Request, target: PortkeyTarget): Headers {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('x-portkey-config');
  headers.set('authorization', `Bearer ${target.api_key}`);
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

    const body = request.method === 'GET' ? undefined : await request.arrayBuffer();

    // If no upstream Portkey key is configured, route directly to provider target
    // from x-portkey-config so tenant managed/BYOK keys still work.
    if (!env.PORTKEY_UPSTREAM_API_KEY) {
      const target = parseTargetFromPortkeyConfig(request);
      const directBaseUrl = target ? resolveDirectProviderBaseUrl(target) : null;
      if (target && directBaseUrl) {
        const directUrl = `${directBaseUrl}${url.pathname}${url.search}`;
        const directResponse = await fetch(directUrl, {
          method: request.method,
          headers: directHeaders(request, target),
          body,
          redirect: 'manual',
        });
        const directHeadersOut = new Headers(directResponse.headers);
        directHeadersOut.set('x-cs-gateway-wrapper', 'portkey-gateway-worker');
        directHeadersOut.set('x-cs-gateway-mode', 'direct-provider');
        return new Response(directResponse.body, {
          status: directResponse.status,
          headers: directHeadersOut,
        });
      }
    }

    const upstreamUrl = `${sanitizeBaseUrl(env.PORTKEY_UPSTREAM_URL)}${url.pathname}${url.search}`;

    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers: forwardHeaders(request, env),
      body,
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
