import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NEWSLETTER_DELIVERIES, NEWSLETTER_ENGAGEMENT_SQL, readNewsletterDelivery } from '$lib/server/newsletter-analytics';

// hooks.server.ts applies the existing first-party admin role check to /api/admin/*.
export const GET: RequestHandler = async ({ platform }) => {
  const db = platform?.env?.DB;
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!db) return json({ error: 'Database unavailable' }, { status: 503, headers });
  try {
    const [engagement, audience, archive] = await Promise.all([
      db.prepare(NEWSLETTER_ENGAGEMENT_SQL).all(),
      db.prepare(`SELECT COUNT(*) AS total, SUM(status = 'unsubscribed') AS unsubscribed,
        SUM(status = 'active') AS active FROM newsletter_subscribers`).first(),
      db.prepare(`SELECT action, COALESCE(json_extract(metadata, '$.trafficClass'), 'unknown') AS traffic_class,
        COUNT(*) AS events, COUNT(DISTINCT session_id) AS sessions FROM unified_events
        WHERE property = 'io' AND (url LIKE 'https://createsomething.io/newsletters%' )
          AND action IN ('page_view', 'content_link_click') AND julianday(created_at) >= julianday('now', '-30 days')
        GROUP BY action, traffic_class`).all()
    ]);
    const deliveries = [];
    for (const entry of NEWSLETTER_DELIVERIES) deliveries.push(await readNewsletterDelivery(entry, platform?.env?.RESEND_API_KEY));
    return json({ observed_at: new Date().toISOString(), window_days: 30, engagement: engagement.results,
      audience, archive: archive.results, deliveries, opens: null, email_clicks: null, replies: null,
      limitations: 'Visits are browser sessions, not unique recipients or an email click rate. Measurement respects existing analytics preferences and DNT. Attribution lasts 30 minutes after a tagged landing. Replies and campaign unsubscribe attribution are not instrumented. Unsubscribed is a current list total, not an edition rate. Tests and automated traffic are separate. Historical untagged visits cannot be recovered.'
    }, { headers });
  } catch {
    return json({ error: 'Newsletter analytics unavailable; no zero values substituted.' }, { status: 503, headers });
  }
};
