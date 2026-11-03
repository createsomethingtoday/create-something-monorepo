import { NEWSLETTER_CAMPAIGNS } from '../newsletter/measurement';

// Provider IDs come from reviewed production receipts, never subject-line inference.
export const NEWSLETTER_DELIVERIES = [
  { campaign: NEWSLETTER_CAMPAIGNS[0], subject: 'The interface is becoming executable', ids: [
    'bdb288f4-ba0f-40eb-b0db-303ca0ba9f36', '02ac98bc-4570-4035-9856-a68d7e180175'
  ] },
  { campaign: NEWSLETTER_CAMPAIGNS[1], subject: 'The new bottleneck is proof', ids: [] },
  { campaign: NEWSLETTER_CAMPAIGNS[2], subject: 'Test the checker before trusting the result', ids: [] }
];

export const NEWSLETTER_ENGAGEMENT_SQL = `WITH landings AS (
  SELECT session_id, json_extract(metadata, '$.newsletterCampaign') AS campaign,
    COALESCE(json_extract(metadata, '$.trafficClass'), 'unknown') AS traffic_class,
    MIN(julianday(created_at)) AS landed_at
  FROM unified_events
  WHERE property = 'io' AND action = 'page_view'
    AND julianday(created_at) >= julianday('now', '-30 days')
    AND json_valid(metadata)
    AND json_extract(metadata, '$.newsletterMeasurement') = 'first-party-v1'
  GROUP BY session_id, campaign, traffic_class
), sessions AS (
  SELECT l.campaign, l.traffic_class, l.session_id,
    MAX(CASE WHEN e.action = 'content_link_click' THEN 1 ELSE 0 END) AS resource_click,
    MAX(CASE WHEN e.action = 'content_copy' THEN 1 ELSE 0 END) AS copied
  FROM landings l LEFT JOIN unified_events e ON e.session_id = l.session_id
    AND e.property = 'io' AND julianday(e.created_at) >= l.landed_at
    AND julianday(e.created_at) <= l.landed_at + (30.0 / 1440)
    AND COALESCE(json_extract(e.metadata, '$.trafficClass'), 'unknown') = l.traffic_class
  GROUP BY l.campaign, l.traffic_class, l.session_id
)
SELECT REPLACE(campaign, '_', '-') AS campaign, traffic_class, COUNT(*) AS landing_sessions,
  SUM(resource_click) AS resource_click_sessions, SUM(copied) AS copy_sessions
FROM sessions GROUP BY campaign, traffic_class ORDER BY campaign, traffic_class`;

export async function readNewsletterDelivery(
  entry: { campaign: string; subject: string; ids: string[] }, apiKey: string | undefined, fetcher: typeof fetch = fetch
) {
  if (!entry.ids.length) return { campaign: entry.campaign, status: 'not-registered', registered: 0, delivered: null, states: {} };
  if (!apiKey) return { campaign: entry.campaign, status: 'unavailable', registered: entry.ids.length, delivered: null, states: {} };
  try {
    const states: Record<string, number> = {};
    // Sequential requests respect provider rate limits; API route reads campaigns sequentially too.
    for (const id of entry.ids) {
      const response = await fetcher(`https://api.resend.com/emails/${id}`, {
        headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error('Provider readback unavailable');
      const value = await response.json() as { id?: string; subject?: string; last_event?: string };
      if (value.id !== id || value.subject !== entry.subject || typeof value.last_event !== 'string') throw new Error('Provider receipt mismatch');
      // Later engagement proves delivery; engagement details remain unmeasured.
      const state = ['opened', 'clicked'].includes(value.last_event) ? 'delivered' : value.last_event;
      states[state] = (states[state] ?? 0) + 1;
    }
    return { campaign: entry.campaign, status: 'verified', registered: entry.ids.length, delivered: states.delivered ?? 0, states };
  } catch {
    return { campaign: entry.campaign, status: 'unavailable', registered: entry.ids.length, delivered: null, states: {} };
  }
}

/** Configured campaign attribution, never recipient click or causal conversion rates. */
export const NEWSLETTER_ATTRIBUTION_SQL = `WITH visits AS (
  SELECT CASE WHEN json_extract(metadata, '$.newsletterMeasurement') = 'first-party-social-v1'
      THEN '2026-09-01-the-interface-is-becoming-executable'
      ELSE REPLACE(json_extract(metadata, '$.newsletterCampaign'), '_', '-') END AS edition,
    CASE WHEN json_extract(metadata, '$.newsletterMeasurement') = 'first-party-v1' THEN 'newsletter'
      ELSE json_extract(metadata, '$.newsletterSource') END AS channel,
    REPLACE(json_extract(metadata, '$.newsletterCampaign'), '_', '-') AS campaign,
    COALESCE(json_extract(metadata, '$.trafficClass'), 'unknown') AS traffic_class,
    COUNT(DISTINCT session_id) AS landing_sessions, 0 AS requested, 0 AS confirmed
  FROM unified_events
  WHERE property = 'io' AND action = 'page_view' AND json_valid(metadata)
    AND ((json_extract(metadata, '$.newsletterMeasurement') = 'first-party-v1'
      AND REPLACE(json_extract(metadata, '$.newsletterCampaign'), '_', '-') IN (${NEWSLETTER_CAMPAIGNS.map(id => `'${id}'`).join(',')}))
      OR (json_extract(metadata, '$.newsletterMeasurement') = 'first-party-social-v1'
        AND json_extract(metadata, '$.newsletterCampaign') = 'field_notes_20260928'
        AND json_extract(metadata, '$.newsletterSource') IN ('linkedin', 'substack')))
    AND julianday(created_at) >= julianday('now', '-30 days')
  GROUP BY edition, channel, campaign, traffic_class
), signups AS (
  SELECT edition, channel, campaign, traffic_class, 0 AS landing_sessions,
    SUM(julianday(requested_at) >= julianday('now', '-30 days')) AS requested,
    SUM(CASE WHEN julianday(confirmed_at) >= julianday('now', '-30 days') THEN 1 ELSE 0 END) AS confirmed
  FROM newsletter_signup_attributions
  WHERE julianday(requested_at) >= julianday('now', '-30 days') OR julianday(confirmed_at) >= julianday('now', '-30 days')
  GROUP BY edition, channel, campaign, traffic_class
), combined AS (SELECT * FROM visits UNION ALL SELECT * FROM signups)
SELECT edition, channel, campaign, traffic_class, SUM(landing_sessions) AS landing_sessions,
  SUM(requested) AS requested, SUM(confirmed) AS confirmed
FROM combined GROUP BY edition, channel, campaign, traffic_class
ORDER BY edition, channel, campaign, traffic_class`;

export interface NewsletterAudienceDeliveryRow {
  campaign: string;
  subject: string;
  resend_email_id: string | null;
}

/** Operator seeds are excluded in SQL; IDs are deduplicated across historical imports. */
export const NEWSLETTER_AUDIENCE_DELIVERIES_SQL = `SELECT e.slug AS campaign, e.subject, d.resend_email_id
  FROM newsletter_editions e LEFT JOIN newsletter_edition_deliveries d
    ON d.edition_slug = e.slug AND d.kind IN ('audience', 'historical-audience')
    AND d.resend_email_id IS NOT NULL ORDER BY e.slug, d.resend_email_id`;

export function mergeNewsletterDeliveryEntries(rows: NewsletterAudienceDeliveryRow[]) {
  const entries = new Map<string, {campaign:string;subject:string;ids:string[]}>();
  for (const entry of NEWSLETTER_DELIVERIES) entries.set(entry.campaign, {...entry,ids:[...entry.ids]});
  for (const row of rows) {
    const entry = entries.get(row.campaign) ?? {campaign:row.campaign,subject:row.subject,ids:[]};
    if (row.resend_email_id && !entry.ids.includes(row.resend_email_id)) entry.ids.push(row.resend_email_id);
    entries.set(row.campaign,entry);
  }
  return [...entries.values()];
}
