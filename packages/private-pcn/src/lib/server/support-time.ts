import type { D1Database } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';

export interface TimedSession {
  id: string;
  network_id: string;
  buyer_id: string;
  creator_id: string;
  status: string;
  method: string;
  expires_at: number;
  tracked_seconds: number;
  timer_started_at: number | null;
  support_period_start: number | null;
  support_period_end: number | null;
  receipt_status: string;
}
// Server time only; device connection time is not available to PRIVATE.
export const elapsedSql =
  'tracked_seconds + CASE WHEN timer_started_at IS NULL THEN 0 ELSE MAX(0,MIN(?,expires_at,support_period_end)-timer_started_at) END';
export async function expireTimers(db: D1Database, subject: string, now: number) {
  await db
    .prepare(
      `UPDATE remote_sessions SET tracked_seconds=${elapsedSql},timer_started_at=NULL,status='ended',receipt_status='pending',outcome='Session window expired. Review the recorded time and outcome with the other participant.',updated_by='system:expiry',updated_at=? WHERE (buyer_id=? OR creator_id=?) AND support_period_start IS NOT NULL AND status='accepted' AND (expires_at<=? OR support_period_end<=?)`
    )
    .bind(now, now, subject, subject, now, now)
    .run();
}
export async function supportLedger(db: D1Database, subject: string) {
  const { results } = await db
    .prepare(
      `WITH periods AS (
      SELECT network_id,period_start,period_end FROM network_billing WHERE period_start>0
      UNION
      SELECT network_id,support_period_start,MAX(support_period_end) FROM remote_sessions WHERE support_period_start>0 GROUP BY network_id,support_period_start
    ), monthly AS (SELECT network_id,period_start,MAX(period_end) AS period_end FROM periods GROUP BY network_id,period_start)
    SELECT n.id AS network_id,n.name,p.period_start,p.period_end,
    CASE WHEN p.period_start=b.period_start THEN b.status ELSE 'historical' END AS billing_status,w.status AS workspace_status,
    COALESCE(SUM(CASE WHEN s.receipt_status='confirmed' THEN s.tracked_seconds ELSE 0 END),0) AS confirmed_seconds,
    COALESCE(SUM(CASE WHEN s.receipt_status='pending' THEN s.tracked_seconds ELSE 0 END),0) AS pending_seconds,
    COALESCE(SUM(CASE WHEN s.receipt_status='disputed' THEN s.tracked_seconds ELSE 0 END),0) AS disputed_seconds
    FROM support_workspaces w JOIN networks n ON n.id=w.network_id JOIN monthly p ON p.network_id=n.id
    LEFT JOIN network_billing b ON b.network_id=n.id
    LEFT JOIN remote_sessions s ON s.network_id=n.id AND s.support_period_start=p.period_start
    WHERE (w.owner_id=? OR w.partner_id=?) GROUP BY n.id,p.period_start ORDER BY p.period_start DESC`
    )
    .bind(subject, subject)
    .all<{
      network_id: string;
      name: string;
      billing_status: string;
      workspace_status: string;
      period_start: number;
      period_end: number;
      confirmed_seconds: number;
      pending_seconds: number;
      disputed_seconds: number;
    }>();
  return results.map((row) => ({
    ...row,
    active:
      row.billing_status === 'active' &&
      row.workspace_status === 'agreed' &&
      row.period_end > Math.floor(Date.now() / 1000),
    included_seconds: 10800,
    remaining_seconds: Math.max(0, 10800 - row.confirmed_seconds)
  }));
}
export async function timeAction(
  db: D1Database,
  row: TimedSession,
  subject: string,
  b: any,
  now: number,
  verify: () => Promise<string | null>
) {
  if (b.action === 'time_start') {
    if (subject !== row.creator_id)
      return json({ error: 'Only the support partner can start the timer.' }, { status: 403 });
    if (b.ready !== true)
      return json({ error: 'Confirm that both people are connected and ready.' }, { status: 400 });
    if (row.status !== 'accepted' || row.expires_at <= now)
      return json({ error: 'An accepted, unexpired session is required.' }, { status: 409 });
    const period = await db
      .prepare(
        "SELECT b.period_start,b.period_end FROM network_billing b JOIN networks n ON n.id=b.network_id WHERE b.network_id=? AND n.kind='support' AND b.status='active'"
      )
      .bind(row.network_id)
      .first<{ period_start: number; period_end: number }>();
    if (
      !period ||
      period.period_start <= 0 ||
      period.period_start > now ||
      period.period_end <= now
    )
      return json(
        {
          error: 'Refresh company billing to verify the current paid period before tracking time.'
        },
        { status: 409 }
      );
    let creator;
    try {
      creator = await verify();
    } catch {
      return json({ error: 'Support access verification is unavailable.' }, { status: 503 });
    }
    if (creator !== subject)
      return json(
        { error: 'An active paid company workspace and approved partner are required.' },
        { status: 403 }
      );
    // Re-read after provider verification, which can advance or close the billing period.
    const current = await db
      .prepare('SELECT period_start,period_end,status FROM network_billing WHERE network_id=?')
      .bind(row.network_id)
      .first<{ period_start: number; period_end: number; status: string }>();
    if (
      !current ||
      current.status !== 'active' ||
      current.period_start !== period.period_start ||
      current.period_end !== period.period_end
    )
      return json({ error: 'Billing changed. Refresh before starting.' }, { status: 409 });
    try {
      const result = await db
        .prepare(
          `UPDATE remote_sessions SET timer_started_at=?,support_period_start=?,support_period_end=?,updated_by=?,updated_at=? WHERE id=? AND status='accepted' AND timer_started_at IS NULL AND receipt_status='none' AND (support_period_start IS NULL OR (support_period_start=? AND support_period_end=?))`
        )
        .bind(
          now,
          period.period_start,
          period.period_end,
          subject,
          now,
          row.id,
          period.period_start,
          period.period_end
        )
        .run();
      return result.meta.changes === 1
        ? json({ success: true })
        : json(
            {
              error: 'Timer is already running or this session belongs to another billing period.'
            },
            { status: 409 }
          );
    } catch {
      return json(
        { error: 'Pause your other active support timer before starting this one.' },
        { status: 409 }
      );
    }
  }
  if (b.action === 'time_pause') {
    const result = await db
      .prepare(
        `UPDATE remote_sessions SET tracked_seconds=${elapsedSql},timer_started_at=NULL,updated_by=?,updated_at=? WHERE id=? AND status='accepted' AND timer_started_at IS NOT NULL`
      )
      .bind(now, subject, now, row.id)
      .run();
    return result.meta.changes === 1
      ? json({ success: true })
      : json({ error: 'There is no running timer.' }, { status: 409 });
  }
  if (subject !== row.buyer_id)
    return json(
      { error: 'Only the buyer can confirm or dispute recorded support.' },
      { status: 403 }
    );
  const disputed = b.action === 'time_dispute';
  if (disputed && (typeof b.note !== 'string' || b.note.trim().length < 10 || b.note.length > 2000))
    return json(
      { error: 'Explain the disputed time or outcome (10–2000 characters, no credentials).' },
      { status: 400 }
    );
  const result = await db
    .prepare(
      "UPDATE remote_sessions SET receipt_status=?,receipt_note=?,updated_by=?,updated_at=? WHERE id=? AND status='ended' AND receipt_status='pending' AND tracked_seconds>0"
    )
    .bind(
      disputed ? 'disputed' : 'confirmed',
      disputed ? b.note.trim() : 'Buyer confirmed the recorded time and outcome.',
      subject,
      now,
      row.id
    )
    .run();
  return result.meta.changes === 1
    ? json({ success: true })
    : json({ error: 'This receipt is not awaiting review.' }, { status: 409 });
}
