import { errorResponse } from './http.js';
import type { Env } from './types.js';

function bearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export function validateAdminToken(request: Request, env: Env): Response | null {
  if (!env.CODE_INDEX_ADMIN_TOKEN) {
    return errorResponse(request, env, 'Code index admin token is not configured.', 503);
  }

  const bearer = bearerToken(request);
  const apiKey = request.headers.get('X-API-Key')?.trim() ?? null;
  if (bearer === env.CODE_INDEX_ADMIN_TOKEN || apiKey === env.CODE_INDEX_ADMIN_TOKEN) {
    return null;
  }

  return errorResponse(request, env, 'Unauthorized', 401);
}
