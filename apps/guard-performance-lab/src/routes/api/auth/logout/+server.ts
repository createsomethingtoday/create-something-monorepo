import type { RequestHandler } from './$types';
import { clearProjectSessionCookie, runtimeEnv } from '$lib/server/access.js';

export const GET: RequestHandler = ({ platform }) => new Response(null, {
  status: 303,
  headers: {
    'cache-control': 'private, no-store',
    location: '/',
    'set-cookie': clearProjectSessionCookie(runtimeEnv(platform).ENVIRONMENT === 'production')
  }
});
