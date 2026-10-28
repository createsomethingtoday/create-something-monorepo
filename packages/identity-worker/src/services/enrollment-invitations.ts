import type { Env } from '../types';
import { generateUUID } from './crypto';

const reply = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export const normalizeEnrollmentEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};
type Invitation = {
  id: string;
  email: string;
  scope: string;
  request_id: string;
  created_by: string;
  reason: string;
  created_at: number;
  expires_at: number;
  revoked_at: number | null;
  redeemed_at: number | null;
};

// Called only after the router authenticates enrollment_invitation_manage.
// Metadata only: issuing admission sends no email and creates no account or role.
export async function manageEnrollmentInvitation(
  request: Request,
  env: Env,
  actor: string,
  action: 'issue' | 'list' | 'revoke',
  id?: string
): Promise<Response> {
  if (env.ENROLLMENT_INVITATIONS_ENABLED !== 'true') return reply({ error: 'not_found' }, 404);
  if (!actor.startsWith('service:') || actor.length > 200)
    return reply({ error: 'forbidden' }, 403);
  const now = Math.floor(Date.now() / 1000);
  if (action === 'list') {
    const email = normalizeEnrollmentEmail(new URL(request.url).searchParams.get('email'));
    if (!email) return reply({ error: 'Valid exact email required.' }, 400);
    const result = await env.DB.prepare(
      'SELECT * FROM enrollment_invitations WHERE email=? ORDER BY created_at DESC,id LIMIT 50'
    )
      .bind(email)
      .all<Invitation>();
    return reply({ invitations: result.results });
  }
  if (action === 'revoke') {
    if (!id || !/^[a-f0-9-]{36}$/.test(id)) return reply({ error: 'Invalid invitation.' }, 400);
    const eventId = generateUUID();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO enrollment_invitation_events(id,invitation_id,action,actor,created_at) SELECT ?,id,'revoked',?,? FROM enrollment_invitations WHERE id=? AND revoked_at IS NULL AND redeemed_at IS NULL"
      ).bind(eventId, actor, now, id),
      env.DB.prepare(
        'UPDATE enrollment_invitations SET revoked_at=? WHERE id=? AND revoked_at IS NULL AND redeemed_at IS NULL'
      ).bind(now, id)
    ]);
    const row = await env.DB.prepare('SELECT * FROM enrollment_invitations WHERE id=?')
      .bind(id)
      .first<Invitation>();
    return row ? reply({ invitation: row }) : reply({ error: 'not_found' }, 404);
  }
  let input: Record<string, unknown>;
  try {
    // Bound even chunked bodies; no credentials or mailbox proofs accepted here.
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Missing body');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2048) {
          await reader.cancel();
          throw new Error('Large body');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || Array.isArray(input) || typeof input !== 'object')
      throw new Error('Invalid body');
  } catch {
    return reply({ error: 'Invalid request.' }, 400);
  }
  if (
    Object.keys(input).some((key) => !['email', 'request_id', 'expires_at', 'reason'].includes(key))
  )
    return reply({ error: 'Unsupported field.' }, 400);
  const email = normalizeEnrollmentEmail(input.email);
  const requestId = input.request_id;
  const expires = input.expires_at;
  const reason = input.reason;
  if (
    !email ||
    typeof requestId !== 'string' ||
    !/^[A-Za-z0-9_-]{8,80}$/.test(requestId) ||
    !Number.isSafeInteger(expires) ||
    typeof expires !== 'number' ||
    expires <= now ||
    expires > now + 604800 ||
    typeof reason !== 'string' ||
    !reason.trim() ||
    reason.length > 256
  )
    return reply({ error: 'Invalid invitation.' }, 400);
  const invitationId = generateUUID();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO enrollment_invitations(id,email,scope,request_id,created_by,reason,created_at,expires_at) VALUES(?,?,'identity:signup',?,?,?,?,?)"
    ).bind(invitationId, email, requestId, actor, reason.trim(), now, expires),
    env.DB.prepare(
      "INSERT INTO enrollment_invitation_events(id,invitation_id,action,actor,created_at) SELECT ?,id,'issued',?,? FROM enrollment_invitations WHERE id=?"
    ).bind(generateUUID(), actor, now, invitationId)
  ]);
  const row = await env.DB.prepare(
    'SELECT * FROM enrollment_invitations WHERE created_by=? AND request_id=?'
  )
    .bind(actor, requestId)
    .first<Invitation>();
  if (!row || row.email !== email || row.expires_at !== expires || row.reason !== reason.trim())
    return reply({ error: 'Idempotency conflict.' }, 409);
  return reply({ invitation: row }, row.id === invitationId ? 201 : 200);
}
