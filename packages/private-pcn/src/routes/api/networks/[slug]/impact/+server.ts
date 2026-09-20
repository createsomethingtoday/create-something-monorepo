import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.identity || !locals.network || locals.network.owner_id !== locals.identity.subject)
    return json({ error: 'Network owner access required.' }, { status: 403 });
  if (!platform?.env.DB) return json({ error: 'Impact report unavailable.' }, { status: 503 });
  const db = platform.env.DB,
    id = locals.network.id;
  const [orders, delivery, playback, members] = await Promise.all([
    db
      .prepare(
        'SELECT status,COUNT(*) AS count FROM asset_orders WHERE network_id=? GROUP BY status'
      )
      .bind(id)
      .all(),
    db
      .prepare(
        "SELECT day,event,count FROM network_impact_daily WHERE network_id=? AND day>=date('now','-30 days') ORDER BY day DESC"
      )
      .bind(id)
      .all(),
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM playback_events WHERE network_id=? AND created_at>=datetime('now','-30 days')"
      )
      .bind(id)
      .first(),
    db
      .prepare('SELECT COUNT(*) AS count FROM members WHERE network_id=? AND active=1')
      .bind(id)
      .first()
  ]);
  return json({
    orders: orders.results,
    delivery: delivery.results,
    playback,
    members,
    note: 'Delivery and playback grants record authorized access, not completed downloads, installs, watch time or verified competence.'
  });
};
