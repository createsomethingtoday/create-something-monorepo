import { parseGuardAccessConfig, type RuntimeEnv } from './access.js';
import type { GuardAccessScope } from './scope.js';

type PlayerAccessAction = 'get' | 'upsert' | 'revoke';

export async function forwardPlayerAccessRequest(input: {
  scope: GuardAccessScope;
  env: RuntimeEnv;
  playerId: string;
  action: PlayerAccessAction;
  passphrase?: string;
  playerCode?: string;
  displayName?: string;
  fetch?: typeof globalThis.fetch;
}): Promise<Response> {
  if (input.scope.role !== 'operator') return response({ error: 'forbidden' }, 403);

  let config;
  try {
    config = parseGuardAccessConfig(input.env);
  } catch {
    return response({ error: 'access_unconfigured' }, 503);
  }
  const binding = [...config.playerBindings.entries()].find(([, playerId]) => playerId === input.playerId);
  if (!binding) return response({ error: 'player_assignment_required' }, 409);

  const adminToken = input.env.GUARD_LAB_IDENTITY_ADMIN_TOKEN?.trim();
  const identityOrigin = (input.env.IDENTITY_API_URL || input.env.CS_IDENTITY_ISSUER)?.trim().replace(/\/+$/, '');
  if (!adminToken || !identityOrigin) return response({ error: 'player_access_unconfigured' }, 503);
  if (input.action === 'upsert' && (!input.passphrase || input.passphrase.length < 15)) {
    return response({ error: 'weak_passphrase', message: 'Use at least 15 characters.' }, 400);
  }

  const subjectId = binding[0];
  const endpoint = input.action === 'get'
    ? '/v1/auth/player-access/admin-get'
    : input.action === 'revoke'
      ? '/v1/auth/player-access/admin-revoke'
      : '/v1/auth/player-access/admin-upsert';
  const body = input.action === 'upsert'
    ? {
        subject_id: subjectId,
        player_code: input.playerCode?.trim() || generatePlayerCode(),
        passphrase: input.passphrase,
        manager_subject: input.scope.subject,
        display_name: input.displayName?.trim() || null
      }
    : { subject_id: subjectId };

  const upstream = await (input.fetch ?? globalThis.fetch)(`${identityOrigin}${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': adminToken },
    body: JSON.stringify(body)
  });
  const payload = await upstream.json().catch(() => ({ error: 'identity_unavailable' }));
  return response(payload, upstream.status);
}

function generatePlayerCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const value = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
  return `GPL-${value.slice(0, 4)}-${value.slice(4)}`;
}

function response(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
