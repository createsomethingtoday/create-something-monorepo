import type { Env } from './types.js';

function getAllowedOrigin(request: Request, env: Env): string {
  const origin = request.headers.get('Origin');
  if (!origin) return '*';

  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    return origin;
  }

  return '*';
}

export function withCorsHeaders(request: Request, env: Env, headers: HeadersInit = {}): Headers {
  const base = new Headers(headers);
  base.set('Access-Control-Allow-Origin', getAllowedOrigin(request, env));
  base.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  base.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Accept');
  base.set('Access-Control-Max-Age', '86400');
  return base;
}

export function corsPreflight(request: Request, env: Env): Response {
  return new Response(null, { status: 204, headers: withCorsHeaders(request, env) });
}

export function jsonResponse(
  request: Request,
  env: Env,
  data: unknown,
  status = 200,
  headers: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: withCorsHeaders(request, env, {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    }),
  });
}

export function textResponse(request: Request, env: Env, body: string, contentType: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: withCorsHeaders(request, env, {
      'Content-Type': contentType,
    }),
  });
}
