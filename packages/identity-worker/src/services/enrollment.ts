import type { Env } from '../types';
import { generateSecureToken, generateUUID, hashPassword, hashToken } from './crypto';

const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const unavailable = () => reply({ error: 'Account verification is temporarily unavailable.' }, 503);
const invalid = () =>
  reply({ error: 'This verification link is invalid or expired. Request a new link.' }, 400);
export const enrollmentOpen = (env: Env) =>
  env.PUBLIC_ENROLLMENT_ENABLED === 'true' ||
  !!env.ENROLLMENT_ALLOWED_EMAILS?.trim() ||
  ((env.PCN_ENROLLMENT_ENABLED === 'true' || !!env.PCN_ENROLLMENT_CANARY_EMAILS?.trim()) &&
    !!env.PCN_DB);
async function emailAllowed(env: Env, email: string, now: number, purpose: string) {
  if (
    env.PUBLIC_ENROLLMENT_ENABLED === 'true' ||
    (env.ENROLLMENT_ALLOWED_EMAILS || '')
      .split(',')
      .some((entry) => entry.trim().toLowerCase() === email)
  )
    return true;
  // A canary narrows rollout only; it never replaces current PCN eligibility.
  const canary = (env.PCN_ENROLLMENT_CANARY_EMAILS || '')
    .split(',')
    .some((entry) => entry.trim().toLowerCase() === email);
  if ((env.PCN_ENROLLMENT_ENABLED !== 'true' && !canary) || !env.PCN_DB) return false;
  if (purpose === 'recovery')
    return !!(await env.DB.prepare(
      'SELECT 1 FROM users WHERE email=? AND deleted_at IS NULL AND email_verified=1'
    )
      .bind(email)
      .first());
  // PCN owns admission. Read current production invitation state at both steps;
  // email proof creates an Identity only, never application access or approval.
  const eligible = await env.PCN_DB.prepare(
    `
    SELECT 1 AS eligible FROM members m JOIN networks n ON n.id=m.network_id
    WHERE m.email=? COLLATE NOCASE AND m.active=1 AND n.status='active'
    UNION ALL
    SELECT 1 FROM creator_invitations i JOIN creator_applications a ON a.subject=i.sponsor
    WHERE i.recipient_email=? COLLATE NOCASE AND i.redeemed_by IS NULL
      AND i.expires_at>? AND a.status='approved'
    LIMIT 1`
  )
    .bind(email, email, now)
    .first();
  return !!eligible;
}
const origin = 'https://private.createsomething.agency';
async function body(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 8192) {
        await reader.cancel();
        throw new Error('Body too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const result = JSON.parse(new TextDecoder().decode(bytes));
  if (!result || typeof result !== 'object' || Array.isArray(result))
    throw new Error('Invalid body');
  return result;
}
async function allowed(env: Env, key: string, max: number, now: number) {
  const window = Math.floor(now / 3600) * 3600;
  const record = await env.DB.prepare(
    `INSERT INTO enrollment_limits(key_hash,window_start,attempts) VALUES(?,?,1)
 ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END, window_start=excluded.window_start RETURNING attempts`
  )
    .bind(await hashToken(key), window)
    .first<{ attempts: number }>();
  return !!record && record.attempts <= max;
}

// Called directly by the browser so CF-Connecting-IP is the actual client.
// No forwarded IP headers or caller-supplied return URLs are trusted.
export async function startEnrollment(request: Request, env: Env): Promise<Response> {
  if (!enrollmentOpen(env) || !env.RESEND_API_KEY) return unavailable();
  const now = Math.floor(Date.now() / 1000);
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return unavailable();
  if (!(await allowed(env, `start:${ip}`, 15, now)))
    return reply({ error: 'Too many requests. Try again later.' }, 429);
  let input;
  try {
    input = await body(request);
  } catch {
    return reply({ error: 'Invalid request.' }, 400);
  }
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const purpose = input.purpose;
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !['signup', 'recovery'].includes(String(purpose))
  )
    return reply({ error: 'Enter a valid email address and request type.' }, 400);
  const accepted = () =>
    reply({
      success: true,
      message: 'If this address can receive account verification, a link will arrive shortly.'
    });
  try {
    if (!(await emailAllowed(env, email, now, String(purpose)))) return accepted();
  } catch {
    return unavailable();
  }
  if (!(await allowed(env, `email:${email}`, 3, now))) return accepted();
  // Bounded expiry cleanup contains no plaintext tokens and never deletes live proof.
  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM enrollment_challenges WHERE token_hash IN (SELECT token_hash FROM enrollment_challenges WHERE expires_at < ? LIMIT 100)'
    ).bind(now - 86400),
    env.DB.prepare(
      'DELETE FROM enrollment_limits WHERE key_hash IN (SELECT key_hash FROM enrollment_limits WHERE window_start < ? LIMIT 100)'
    ).bind(now - 86400)
  ]);
  const token = generateSecureToken(32);
  const digest = await hashToken(token);
  await env.DB.prepare(
    'INSERT INTO enrollment_challenges(token_hash,email,purpose,expires_at,created_at) VALUES(?,?,?,?,?)'
  )
    .bind(digest, email, purpose, now + 900, now)
    .run();
  const next =
    typeof input.next_path === 'string' &&
    /^\/(?:start|dashboard|collection|library|apply|review|support-session|support(?:\/(?:partner|[a-f0-9-]{36}))?|impact|field-engineering|n\/[a-z0-9-]{3,48}(?:\/(?:studio|settings|seller|impact|field-notes|assets(?:\/[a-z0-9-]{1,64})?))?)$/.test(
      input.next_path
    )
      ? input.next_path
      : '/start';
  const link = `${origin}/verify?mode=${purpose}&next=${encodeURIComponent(next)}#token=${encodeURIComponent(token)}`;
  const action = purpose === 'recovery' ? 'reset your password' : 'create your account';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `enrollment-${digest}`
      },
      body: JSON.stringify({
        from: 'CREATE SOMETHING <noreply@createsomething.io>',
        to: [email],
        subject: 'Verify your CREATE SOMETHING account',
        text: `Use this link to ${action}:\n\n${link}\n\nThis link expires in 15 minutes and can be used once. If you did not request it, ignore this email.`
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Mail delivery rejected');
  } catch {
    await env.DB.prepare('DELETE FROM enrollment_challenges WHERE token_hash=?').bind(digest).run();
    return unavailable();
  }
  return accepted();
}

export async function completeEnrollment(request: Request, env: Env): Promise<Response> {
  if (!enrollmentOpen(env)) return unavailable();
  const now = Math.floor(Date.now() / 1000);
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return unavailable();
  if (!(await allowed(env, `complete:${ip}`, 30, now)))
    return reply({ error: 'Too many requests. Try again later.' }, 429);
  let input;
  try {
    input = await body(request);
  } catch {
    return reply({ error: 'Invalid request.' }, 400);
  }
  if (typeof input.token !== 'string' || input.token.length < 40 || input.token.length > 128)
    return invalid();
  if (
    typeof input.password !== 'string' ||
    input.password.length < 12 ||
    input.password.length > 256
  )
    return reply({ error: 'Use a password between 12 and 256 characters.' }, 400);
  const digest = await hashToken(input.token);
  const proof = await env.DB.prepare(
    'SELECT email,purpose FROM enrollment_challenges WHERE token_hash=? AND claimed_at IS NULL AND expires_at>?'
  )
    .bind(digest, now)
    .first<{ email: string; purpose: 'signup' | 'recovery' }>();
  if (!proof) return invalid();
  try {
    if (!(await emailAllowed(env, proof.email, now, proof.purpose))) return unavailable();
  } catch {
    return unavailable();
  }
  const password = await hashPassword(input.password);
  // Compare-and-set is the replay boundary, including concurrent completions.
  const claimed = await env.DB.prepare(
    'UPDATE enrollment_challenges SET claimed_at=? WHERE token_hash=? AND claimed_at IS NULL AND expires_at>? RETURNING email,purpose'
  )
    .bind(now, digest, now)
    .first<{ email: string; purpose: 'signup' | 'recovery' }>();
  if (!claimed) return invalid();
  const existing = await env.DB.prepare('SELECT id,deleted_at FROM users WHERE email=?')
    .bind(claimed.email)
    .first<{ id: string; deleted_at: string | null }>();
  if (claimed.purpose === 'signup') {
    if (existing)
      return reply(
        { error: 'An account already exists. Sign in or request password recovery.' },
        409
      );
    try {
      await env.DB.prepare(
        "INSERT INTO users(id,email,email_verified,password_hash,source) VALUES(?,?,1,?,'io')"
      )
        .bind(generateUUID(), claimed.email, password)
        .run();
    } catch {
      return reply(
        { error: 'Account creation could not finish. Sign in or request a new verification link.' },
        409
      );
    }
  } else {
    if (!existing || existing.deleted_at)
      return reply(
        { error: 'This account cannot be recovered. Contact CREATE SOMETHING for help.' },
        409
      );
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE users SET password_hash=?,email_verified=1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL'
      ).bind(password, existing.id),
      env.DB.prepare(
        'UPDATE refresh_tokens SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL'
      ).bind(existing.id)
    ]);
  }
  // Mailbox proof creates no session and grants no network membership.
  return reply({ success: true, email: claimed.email });
}
