/**
 * CORS Handling
 *
 * Canon: Access control should be invisible when correct.
 */

import type { Env } from '../types';

export interface CorsResult {
  headers: Record<string, string>;
  isAllowed: boolean;
}

/**
 * Parse allowed origins from environment variable
 */
export function parseAllowedOrigins(env: Env): Set<string> {
  return new Set(env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()));
}

/**
 * Handle CORS for a request
 */
export function handleCors(request: Request, env: Env): CorsResult {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = parseAllowedOrigins(env);
  const isAllowed = allowedOrigins.has(origin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600',
  };

  // Only set Allow-Origin if origin is in allowlist
  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return { headers, isAllowed };
}

/**
 * Create preflight response for OPTIONS requests
 */
export function createPreflightResponse(corsHeaders: Record<string, string>): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Create JSON response with CORS headers
 */
export function jsonResponse<T>(
  data: T,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Create error response with CORS headers
 */
export function errorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return jsonResponse({ message, error: true }, status, corsHeaders);
}
