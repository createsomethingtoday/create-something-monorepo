import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { boundedText } from '$lib/server/body';
import { isSameOrigin, normalizeEmail } from '$lib/server/policy';
const hash = async (token: string) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))),
    (v) => v.toString(16).padStart(2, '0')
  ).join('');
export const POST: RequestHandler = async ({ locals, platform, request, cookies }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  if (!locals.identity) return json({ error: 'Sign in to continue.' }, { status: 401 });
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Invitations are unavailable.' }, { status: 503 });
  let body;
  try {
    body = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid invitation.' }, { status: 400 });
  }
  if (body?.action === 'redeem' && !body.token) body.token = cookies?.get('__Host-pcn_invitation');
  const subject = locals.identity.subject;
  if (body?.action === 'create') {
    const email = normalizeEmail(body.email);
    if (!email || email === locals.identity.email)
      return json({ error: 'Use the invited creator’s email address.' }, { status: 400 });
    const token = crypto.randomUUID() + crypto.randomUUID();
    const result = await db
      .prepare(
        `INSERT INTO creator_invitations(token_hash,sponsor,recipient_email,expires_at)
      SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM creator_applications WHERE subject=? AND status='approved')
      AND (SELECT COUNT(*) FROM creator_invitations WHERE sponsor=? AND expires_at>? AND redeemed_by IS NULL)<10`
      )
      .bind(
        await hash(token),
        subject,
        email,
        Math.floor(Date.now() / 1000) + 30 * 86400,
        subject,
        subject,
        Math.floor(Date.now() / 1000)
      )
      .run();
    if (result.meta.changes !== 1)
      return json(
        { error: 'Approval is required, with at most ten outstanding invitations.' },
        { status: 403 }
      );
    return json({ token, url: `/apply?invite=${token}`, expiresInDays: 30 }, { status: 201 });
  }
  if (body?.action === 'redeem' && typeof body.token === 'string' && body.token.length <= 100) {
    const tokenHash = await hash(body.token);
    const existing = await db
      .prepare(
        'SELECT redeemed_by FROM creator_invitations WHERE token_hash=? AND recipient_email=?'
      )
      .bind(tokenHash, locals.identity.email)
      .first<{ redeemed_by: string | null }>();
    if (existing?.redeemed_by === subject) return json({ success: true });
    try {
      const result = await db
        .prepare(
          `UPDATE creator_invitations SET redeemed_by=?,redeemed_at=CURRENT_TIMESTAMP
        WHERE token_hash=? AND recipient_email=? AND redeemed_by IS NULL AND expires_at>?
        AND sponsor<>? AND EXISTS(SELECT 1 FROM creator_applications WHERE subject=?)
        AND EXISTS(SELECT 1 FROM creator_applications WHERE subject=creator_invitations.sponsor AND status='approved')`
        )
        .bind(
          subject,
          tokenHash,
          locals.identity.email,
          Math.floor(Date.now() / 1000),
          subject,
          subject
        )
        .run();
      if (result.meta.changes === 1) return json({ success: true });
    } catch {}
    return json(
      { error: 'Invitation unavailable. Use the invited email and submit your application first.' },
      { status: 404 }
    );
  }
  return json({ error: 'Choose an invitation action.' }, { status: 400 });
};
