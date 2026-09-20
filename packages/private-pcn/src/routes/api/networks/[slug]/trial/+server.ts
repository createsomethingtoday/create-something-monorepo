import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isSameOrigin } from '$lib/server/policy';
export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (
    !isSameOrigin(request) ||
    !locals.identity ||
    !locals.network ||
    locals.network.owner_id !== locals.identity.subject
  )
    return json({ error: 'Network owner access required.' }, { status: 403 });
  if (platform?.env.PCN_SELF_SERVICE_ENABLED !== 'true')
    return json(
      { error: 'Network activation is not available yet. Your draft is saved.' },
      { status: 503 }
    );
  const db = platform.env.DB,
    subject = locals.identity.subject,
    network = locals.network.id;
  const approved = await db
    .prepare("SELECT subject FROM creator_applications WHERE subject=? AND status='approved'")
    .bind(subject)
    .first();
  if (!approved) return json({ error: 'Creator approval is required.' }, { status: 403 });
  const prior = await db
    .prepare('SELECT network_id,starts_at,ends_at FROM creator_trials WHERE subject=?')
    .bind(subject)
    .first<{ network_id: string; starts_at: number; ends_at: number }>();
  if (prior)
    return prior.network_id === network
      ? json({ startsAt: prior.starts_at, endsAt: prior.ends_at })
      : json({ error: 'Your free month is already assigned to another network.' }, { status: 409 });
  const start = new Date();
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCMonth(end.getUTCMonth() + 1);
  if (end.getUTCDate() !== day) end.setUTCDate(0);
  const starts = Math.floor(start.getTime() / 1000),
    ends = Math.floor(end.getTime() / 1000);
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO creator_trials(subject,network_id,starts_at,ends_at) SELECT ?,?,?,?
      WHERE EXISTS(SELECT 1 FROM creator_invitations WHERE redeemed_by=?)
      AND EXISTS(SELECT 1 FROM networks WHERE id=? AND owner_id=? AND status='draft')
      AND NOT EXISTS(SELECT 1 FROM support_workspaces WHERE network_id=?)
      AND NOT EXISTS(SELECT 1 FROM network_billing WHERE network_id=? AND subscription_id IS NOT NULL)
      ON CONFLICT(subject) DO NOTHING`
      )
      .bind(subject, network, starts, ends, subject, network, subject, network, network),
    db
      .prepare(
        "UPDATE networks SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS(SELECT 1 FROM creator_trials WHERE subject=? AND network_id=? AND ends_at>?)"
      )
      .bind(network, subject, network, starts)
  ]);
  if (results[0].meta.changes !== 1)
    return json(
      { error: 'An unused creator invitation and a draft network are required.' },
      { status: 409 }
    );
  return json({ startsAt: starts, endsAt: ends });
};
