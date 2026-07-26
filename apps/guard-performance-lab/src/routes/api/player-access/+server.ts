import type { RequestHandler } from './$types';
import { resolveGuardApplicationAccess, runtimeEnv } from '$lib/server/access.js';
import { forwardPlayerAccessRequest } from '$lib/server/player-access-http.js';

async function scopeFor(event: Parameters<RequestHandler>[0]) {
  const env = runtimeEnv(event.platform);
  const access = await resolveGuardApplicationAccess({
    request: event.request,
    url: event.url,
    env,
    fetch: event.fetch
  });
  return { env, access };
}

export const GET: RequestHandler = async (event) => {
  const { env, access } = await scopeFor(event);
  if (!access.scope) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const playerId = event.url.searchParams.get('playerId')?.trim();
  if (!playerId) return Response.json({ error: 'player_id_required' }, { status: 400 });
  return forwardPlayerAccessRequest({ scope: access.scope, env, playerId, action: 'get', fetch: event.fetch });
};

export const POST: RequestHandler = async (event) => {
  const { env, access } = await scopeFor(event);
  if (!access.scope) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = await event.request.json().catch(() => null) as {
    action?: 'upsert' | 'revoke';
    playerId?: string;
    playerCode?: string;
    passphrase?: string;
    displayName?: string;
  } | null;
  if (!body?.playerId || (body.action !== 'upsert' && body.action !== 'revoke')) {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }
  return forwardPlayerAccessRequest({
    scope: access.scope,
    env,
    playerId: body.playerId,
    action: body.action,
    playerCode: body.playerCode,
    passphrase: body.passphrase,
    displayName: body.displayName,
    fetch: event.fetch
  });
};
