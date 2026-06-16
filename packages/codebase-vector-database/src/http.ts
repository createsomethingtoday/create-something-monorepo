import type { Env } from './types.js';

function allowedOrigin(request: Request, env: Env): string | null {
  const configured = env.ALLOWED_ORIGINS ?? '';
  const origin = request.headers.get('Origin') ?? '';
  if (!configured || configured === '*') return origin || '*';
  const allowed = configured.split(',').map((item) => item.trim());
  return allowed.includes(origin) ? origin : null;
}

export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = allowedOrigin(request, env);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function corsPreflight(request: Request, env: Env): Response {
  return new Response(null, { headers: corsHeaders(request, env) });
}

export function jsonResponse(request: Request, env: Env, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request, env),
    },
  });
}

export function errorResponse(request: Request, env: Env, message: string, status = 400, details?: unknown): Response {
  return jsonResponse(request, env, { error: message, ...(details ? { details } : {}) }, status);
}
