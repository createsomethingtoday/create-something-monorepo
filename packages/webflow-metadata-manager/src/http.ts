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
  const result = new Headers(headers);
  result.set('Access-Control-Allow-Origin', getAllowedOrigin(request, env));
  result.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  result.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
  result.set('Access-Control-Max-Age', '86400');
  return result;
}

export function corsPreflight(request: Request, env: Env): Response {
  return new Response(null, { status: 204, headers: withCorsHeaders(request, env) });
}

export function jsonResponse(request: Request, env: Env, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: withCorsHeaders(request, env, {
      'Content-Type': 'application/json; charset=utf-8',
    }),
  });
}

export function htmlResponse(request: Request, env: Env, html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: withCorsHeaders(request, env, {
      'Content-Type': 'text/html; charset=utf-8',
    }),
  });
}

export function textResponse(
  request: Request,
  env: Env,
  body: string,
  contentType: string,
  status = 200,
  cacheControl?: string,
): Response {
  const headers = withCorsHeaders(request, env, {
    'Content-Type': contentType,
  });

  if (cacheControl) {
    headers.set('Cache-Control', cacheControl);
  }

  return new Response(body, {
    status,
    headers,
  });
}
