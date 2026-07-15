import type { AuthenticatedUser, Env } from './types';

const PAIRING_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_INPUT_BYTES = 8 * 1024;

export class CompanionPairingInputError extends Error {}

function reviewerIds(env: Env): Set<string> {
  return new Set(
    (env.REVIEWER_USER_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text || text.length > MAX_INPUT_BYTES) {
    throw new CompanionPairingInputError('Companion pairing input is missing or too large.');
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new CompanionPairingInputError('Companion pairing input must be valid JSON.');
  }
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function createCompanionPairing(
  reviewId: string,
  request: Request,
  env: Env,
  user: AuthenticatedUser
): Promise<{ code: string; expiresAt: string } | null> {
  if (user.companionSession) return null;
  const input = await readJson(request);
  if (typeof input.reviewVersionId !== 'string' || !input.reviewVersionId) {
    throw new CompanionPairingInputError('An exact reviewVersionId is required.');
  }
  const actorRole = reviewerIds(env).has(user.id) ? 'reviewer' : 'developer';
  const version = await env.DB.prepare(
    `SELECT r.owner_user_id
       FROM review_versions rv
       JOIN reviews r ON r.id = rv.review_id
      WHERE rv.review_id = ? AND rv.id = ?
        AND (? = 'reviewer' OR r.owner_user_id = ?)`
  )
    .bind(reviewId, input.reviewVersionId, actorRole, user.id)
    .first<{ owner_user_id: string }>();
  if (!version) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + PAIRING_TTL_MS).toISOString();
  const code = randomToken();
  await env.DB.prepare(
    `INSERT INTO companion_pairings
      (id, code_sha256, review_id, review_version_id, owner_user_id, actor_user_id,
       actor_site_id, actor_role, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      await sha256(code),
      reviewId,
      input.reviewVersionId,
      version.owner_user_id,
      user.id,
      user.siteId,
      actorRole,
      now.toISOString(),
      expiresAt
    )
    .run();
  return { code, expiresAt };
}

export async function redeemCompanionPairing(
  request: Request,
  env: Env
): Promise<
  | {
      token: string;
      expiresAt: string;
      reviewId: string;
      reviewVersionId: string;
      actorRole: 'developer' | 'reviewer';
      evidenceTrust: 'partner_supplied' | 'webflow_observed';
    }
  | null
> {
  const input = await readJson(request);
  if (typeof input.code !== 'string' || input.code.length < 32 || input.code.length > 256) {
    throw new CompanionPairingInputError('A valid one-time pairing code is required.');
  }
  const now = new Date();
  const pairing = await env.DB.prepare(
    `UPDATE companion_pairings
        SET redeemed_at = ?
      WHERE code_sha256 = ? AND redeemed_at IS NULL AND expires_at > ?
      RETURNING id, review_id, review_version_id, actor_user_id, actor_site_id, actor_role`
  )
    .bind(now.toISOString(), await sha256(input.code), now.toISOString())
    .first<{
      id: string;
      review_id: string;
      review_version_id: string;
      actor_user_id: string;
      actor_site_id: string | null;
      actor_role: 'developer' | 'reviewer';
    }>();
  if (!pairing) return null;

  const token = randomToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  await env.DB.prepare(
    `INSERT INTO companion_sessions
      (id, token_sha256, pairing_id, review_id, review_version_id, actor_user_id,
       actor_site_id, actor_role, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      await sha256(token),
      pairing.id,
      pairing.review_id,
      pairing.review_version_id,
      pairing.actor_user_id,
      pairing.actor_site_id,
      pairing.actor_role,
      now.toISOString(),
      expiresAt
    )
    .run();

  return {
    token,
    expiresAt,
    reviewId: pairing.review_id,
    reviewVersionId: pairing.review_version_id,
    actorRole: pairing.actor_role,
    evidenceTrust:
      pairing.actor_role === 'reviewer' ? 'webflow_observed' : 'partner_supplied'
  };
}
