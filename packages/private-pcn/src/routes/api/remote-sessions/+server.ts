import {
  elapsedSql,
  expireTimers,
  supportLedger,
  timeAction,
  type TimedSession
} from '$lib/server/support-time';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { boundedText } from '$lib/server/body';
import { isSameOrigin } from '$lib/server/policy';
import { paidAccess } from '$lib/server/billing';
import { refreshBuyerRelease } from '$lib/server/asset-orders';
import type { AssetRelease } from '$lib/assets';
import type { Network } from '$lib/server/networks';

type Env = App.Platform['env'];
async function relationship(env: Env, networkId: string, buyer: string) {
  const db = env.DB;
  const network = await db
    .prepare('SELECT * FROM networks WHERE id=?')
    .bind(networkId)
    .first<Network>();
  if (!network) return null;
  if (network.kind === 'support') {
    const support = await db
      .prepare(
        "SELECT s.partner_id FROM support_workspaces s JOIN support_partners p ON p.subject=s.partner_id JOIN creator_applications a ON a.subject=p.subject WHERE s.network_id=? AND s.owner_id=? AND s.status='agreed' AND p.approved=1 AND a.status='approved'"
      )
      .bind(network.id, buyer)
      .first<{ partner_id: string }>();
    return support && (await paidAccess(env, network)) ? support.partner_id : null;
  }
  if (network.owner_id === buyer) return null;
  const creator = await db
    .prepare("SELECT subject FROM creator_applications WHERE subject=? AND status='approved'")
    .bind(network.owner_id)
    .first();
  if (!creator) return null;
  const { results } = await db
    .prepare(
      "SELECT r.* FROM asset_entitlements e JOIN asset_releases r ON r.id=e.release_id WHERE e.network_id=? AND e.buyer_id=? AND e.status='active'"
    )
    .bind(network.id, buyer)
    .all<AssetRelease>();
  for (const release of results) {
    await refreshBuyerRelease(env, release, buyer);
    if (
      await db
        .prepare(
          "SELECT id FROM asset_entitlements WHERE release_id=? AND buyer_id=? AND status='active'"
        )
        .bind(release.id, buyer)
        .first()
    )
      return network.owner_id;
  }
  return null;
}
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.identity || !platform?.env.DB)
    return json({ error: 'Sign in to view support sessions.' }, { status: 401 });
  if (locals.impersonation)
    return json({ error: 'Use your own account for remote support.' }, { status: 403 });
  await expireTimers(platform.env.DB, locals.identity.subject, Math.floor(Date.now() / 1000));
  const { results: sessions } = await platform.env.DB.prepare(
    `WITH visible AS (SELECT * FROM remote_sessions WHERE buyer_id=? OR creator_id=?), recent AS (SELECT id FROM visible ORDER BY created_at DESC LIMIT 100) SELECT s.*,n.name,n.slug,n.kind FROM visible s JOIN networks n ON n.id=s.network_id WHERE s.receipt_status IN ('pending','disputed') OR s.id IN (SELECT id FROM recent) ORDER BY s.created_at DESC`
  )
    .bind(locals.identity.subject, locals.identity.subject)
    .all();
  return json({
    sessions,
    ledger: await supportLedger(platform.env.DB, locals.identity.subject),
    subject: locals.identity.subject,
    enabled: platform.env.PCN_REMOTE_SESSIONS_ENABLED === 'true'
  });
};
export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  if (!locals.identity || !platform?.env.DB)
    return json({ error: 'Sign in to continue.' }, { status: 401 });
  if (locals.impersonation)
    return json({ error: 'Use your own account for remote support.' }, { status: 403 });
  const env = platform.env,
    db = env.DB,
    subject = locals.identity.subject;
  if (env.PCN_REMOTE_SESSIONS_ENABLED !== 'true')
    return json({ error: 'Remote sessions are not available yet.' }, { status: 503 });
  let b;
  try {
    b = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid session request.' }, { status: 400 });
  }
  const now = Math.floor(Date.now() / 1000);
  await expireTimers(db, subject, now);
  if (b?.action === 'request') {
    if (
      typeof b.network !== 'string' ||
      !['rustdesk', 'zoom'].includes(b.method) ||
      typeof b.scope !== 'string' ||
      b.scope.trim().length < 20 ||
      b.scope.length > 2000 ||
      b.consent !== true ||
      !Number.isSafeInteger(b.budget) ||
      b.budget < 0 ||
      b.budget > 100000
    )
      return json(
        {
          error:
            'Choose a method, describe the task, set a usage budget and confirm attended access.'
        },
        { status: 400 }
      );
    let creator;
    try {
      creator = await relationship(env, b.network, subject);
    } catch {
      return json({ error: 'Purchase verification is temporarily unavailable.' }, { status: 503 });
    }
    if (!creator)
      return json(
        { error: 'An active asset purchase or company-support subscription is required.' },
        { status: 403 }
      );
    const id = crypto.randomUUID();
    await db
      .prepare(
        "UPDATE remote_sessions SET status='ended',updated_by=?,updated_at=? WHERE network_id=? AND buyer_id=? AND status IN ('requested','accepted') AND expires_at<=?"
      )
      .bind(subject, now, b.network, subject, now)
      .run();
    try {
      await db
        .prepare(
          'INSERT INTO remote_sessions(id,network_id,buyer_id,creator_id,method,scope,budget_cents,consent_version,updated_by,expires_at,buyer_email) VALUES(?,?,?,?,?,?,?,?,?,?,?)'
        )
        .bind(
          id,
          b.network,
          subject,
          creator,
          b.method,
          b.scope.trim(),
          b.budget,
          'attended_v1',
          subject,
          now + 86400,
          locals.identity.email
        )
        .run();
    } catch {
      return json({ error: 'A request is already open. Refresh your sessions.' }, { status: 409 });
    }
    return json({ id }, { status: 201 });
  }
  if (typeof b?.id !== 'string') return json({ error: 'Choose a session.' }, { status: 400 });
  const row = await db
    .prepare('SELECT * FROM remote_sessions WHERE id=? AND (buyer_id=? OR creator_id=?)')
    .bind(b.id, subject, subject)
    .first<TimedSession>();
  if (!row) return json({ error: 'Session not found.' }, { status: 404 });
  if (['time_start', 'time_pause', 'time_confirm', 'time_dispute'].includes(b.action))
    return timeAction(db, row, subject, b, now, () =>
      relationship(env, row.network_id, row.buyer_id)
    );
  if (b.action === 'accept') {
    if (subject !== row.creator_id || row.expires_at <= now)
      return json(
        { error: 'Only the invited creator can accept an unexpired request.' },
        { status: 403 }
      );
    let creator;
    try {
      creator = await relationship(env, row.network_id, row.buyer_id);
    } catch {
      return json({ error: 'Access verification is unavailable.' }, { status: 503 });
    }
    if (creator !== subject)
      return json(
        { error: 'The buyer relationship or creator approval is no longer active.' },
        { status: 403 }
      );
    let meeting = '';
    if (row.method === 'zoom') {
      try {
        const u = new URL(b.meeting);
        if (
          u.protocol !== 'https:' ||
          !(u.hostname === 'zoom.us' || u.hostname.endsWith('.zoom.us')) ||
          u.username ||
          u.password ||
          !/^\/j\/\d+/.test(u.pathname)
        )
          throw new Error();
        meeting = u.href;
      } catch {
        return json(
          { error: 'Provide a meeting link from your own Zoom account (https://…zoom.us/j/…). ' },
          { status: 400 }
        );
      }
    }
    const result = await db
      .prepare(
        "UPDATE remote_sessions SET status='accepted',meeting_url=?,updated_by=?,updated_at=?,expires_at=? WHERE id=? AND status='requested'"
      )
      .bind(meeting, subject, now, now + 7200, row.id)
      .run();
    return result.meta.changes > 0
      ? json({ success: true })
      : json({ error: 'This request was already decided.' }, { status: 409 });
  }
  if (b.action === 'end' || b.action === 'decline') {
    if (b.action === 'decline' && subject !== row.creator_id)
      return json({ error: 'Only the creator can decline.' }, { status: 403 });
    if (typeof b.outcome !== 'string' || b.outcome.length > 4000)
      return json({ error: 'Provide a short outcome without credentials.' }, { status: 400 });
    if (
      (row.tracked_seconds > 0 || row.timer_started_at !== null) &&
      (b.action !== 'end' || b.outcome.trim().length < 10)
    )
      return json(
        { error: 'Describe the work and verification before submitting time for buyer review.' },
        { status: 400 }
      );
    const result = await db
      .prepare(
        `UPDATE remote_sessions SET tracked_seconds=${elapsedSql},timer_started_at=NULL,receipt_status=CASE WHEN support_period_start IS NOT NULL THEN 'pending' ELSE 'none' END,status=?,outcome=?,updated_by=?,updated_at=? WHERE id=? AND status IN ('requested','accepted') AND ((tracked_seconds=0 AND timer_started_at IS NULL) OR ?)`
      )
      .bind(
        now,
        b.action === 'end' ? 'ended' : 'declined',
        b.outcome.trim(),
        subject,
        now,
        row.id,
        b.action === 'end' && b.outcome.trim().length >= 10 ? 1 : 0
      )
      .run();
    return result.meta.changes > 0
      ? json({ success: true })
      : json({ error: 'This session has already ended.' }, { status: 409 });
  }
  return json({ error: 'Unknown session action.' }, { status: 400 });
};
