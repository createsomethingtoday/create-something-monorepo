import type { AuthenticatedUser, Env } from './types';

interface ResolvedWebflowUser {
  id?: unknown;
  siteId?: unknown;
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get('authorization');
  if (!value?.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length).trim();
  return token || null;
}

export async function authenticate(
  request: Request,
  env: Env
): Promise<AuthenticatedUser | null> {
  const token = bearerToken(request);
  if (!token) return null;

  if (
    env.ENVIRONMENT !== 'production' &&
    env.PREFLIGHT_DEV_TOKEN &&
    token === env.PREFLIGHT_DEV_TOKEN
  ) {
    return { id: 'local-webflow-user', siteId: 'local-webflow-site' };
  }

  if (
    env.ENVIRONMENT !== 'production' &&
    env.PREFLIGHT_REVIEWER_DEV_TOKEN &&
    token === env.PREFLIGHT_REVIEWER_DEV_TOKEN
  ) {
    return { id: 'local-webflow-reviewer', siteId: 'local-webflow-review-site' };
  }

  if (!env.WEBFLOW_APP_ACCESS_TOKEN) return null;

  const response = await fetch('https://api.webflow.com/beta/token/resolve', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.WEBFLOW_APP_ACCESS_TOKEN}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ idToken: token })
  });

  if (!response.ok) return null;
  const resolved = (await response.json()) as ResolvedWebflowUser;
  if (typeof resolved.id !== 'string' || !resolved.id) return null;

  return {
    id: resolved.id,
    siteId: typeof resolved.siteId === 'string' ? resolved.siteId : null
  };
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function authenticateCompanion(
  request: Request,
  env: Env
): Promise<AuthenticatedUser | null> {
  const webflowUser = await authenticate(request, env);
  if (webflowUser) return webflowUser;

  const token = bearerToken(request);
  if (!token) return null;
  const now = new Date().toISOString();
  const session = await env.DB.prepare(
    `SELECT actor_user_id, actor_site_id, actor_role, review_id, review_version_id
       FROM companion_sessions
      WHERE token_sha256 = ? AND revoked_at IS NULL AND expires_at > ?`
  )
    .bind(await sha256(token), now)
    .first<{
      actor_user_id: string;
      actor_site_id: string | null;
      actor_role: 'developer' | 'reviewer';
      review_id: string;
      review_version_id: string;
    }>();
  if (!session) return null;
  return {
    id: session.actor_user_id,
    siteId: session.actor_site_id,
    companionSession: {
      reviewId: session.review_id,
      reviewVersionId: session.review_version_id,
      actorRole: session.actor_role
    }
  };
}

export function companionRoleForUser(
  user: AuthenticatedUser,
  env: Env
): 'developer' | 'reviewer' {
  if (user.companionSession) return user.companionSession.actorRole;
  return new Set(
    (env.REVIEWER_USER_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  ).has(user.id)
    ? 'reviewer'
    : 'developer';
}
