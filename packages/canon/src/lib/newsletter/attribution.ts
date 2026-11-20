import { classifyAnalyticsTraffic } from '../analytics/server.js';

/** Reviewed public campaign registry. No addresses, tokens or arbitrary UTM content. */
export const NEWSLETTER_CAMPAIGNS = [
  '2026-09-01-the-interface-is-becoming-executable',
  '2026-09-03-the-receipt-must-name-the-state',
  '2026-09-08-test-the-checker'
] as const;

export interface NewsletterAttribution {
  edition: string;
  channel: 'newsletter' | 'linkedin' | 'substack';
  campaign: string;
}

export interface NewsletterAttributionContext {
  doNotTrack?: boolean;
  userOptedOut?: boolean;
  userAgent?: string;
  requestUrl?: string;
}

export interface NewsletterAttributionDatabase {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<{ success: boolean }>;
      first<T = unknown>(): Promise<T | null>;
    };
  };
}

export function resolveNewsletterAttribution(input: unknown): NewsletterAttribution | null {
  if (typeof input !== 'string' || input.length > 4096) return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (
    url.origin !== 'https://createsomething.io' ||
    url.username ||
    url.password ||
    url.pathname.startsWith('/admin')
  )
    return null;
  if (
    ['utm_source', 'utm_medium', 'utm_campaign'].some(
      (key) => url.searchParams.getAll(key).length !== 1
    )
  )
    return null;
  const channel = url.searchParams.get('utm_source');
  const medium = url.searchParams.get('utm_medium');
  const campaign = url.searchParams.get('utm_campaign');
  if (
    channel === 'newsletter' &&
    medium === 'email' &&
    NEWSLETTER_CAMPAIGNS.some((id) => id === campaign)
  ) {
    return { edition: campaign!, channel, campaign: campaign! };
  }
  const path = url.pathname.replace(/\/$/, '');
  if (
    (channel === 'linkedin' || channel === 'substack') &&
    medium === 'social' &&
    campaign === 'field-notes-20260928' &&
    (path === '/newsletters' || path === `/newsletters/${NEWSLETTER_CAMPAIGNS[0]}`)
  ) {
    return { edition: NEWSLETTER_CAMPAIGNS[0], channel, campaign };
  }
  return null;
}

export async function recordNewsletterSignupAttribution(
  db: NewsletterAttributionDatabase,
  input: {
    email: string;
    confirmationEmailId: string;
    confirmationToken: string;
    landingUrl?: string;
    analyticsEnabled?: boolean;
    sessionId?: string;
  },
  context: NewsletterAttributionContext = {}
): Promise<void> {
  if (
    input.analyticsEnabled !== true ||
    !input.confirmationToken ||
    context.doNotTrack ||
    context.userOptedOut
  )
    return;
  let attribution = resolveNewsletterAttribution(input.landingUrl);
  let trafficClass: string = 'unknown';
  if (attribution) {
    const classification = classifyAnalyticsTraffic({
      url: input.landingUrl,
      userAgent: context.userAgent
    });
    trafficClass =
      classification.trafficClass === 'external' && !context.userAgent
        ? 'unknown'
        : classification.trafficClass;
    if (
      context.requestUrl &&
      /\.(?:pages\.dev)$|^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(
        new URL(context.requestUrl).hostname
      )
    )
      trafficClass = 'preview';
  } else if (
    typeof input.sessionId === 'string' &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(input.sessionId)
  ) {
    // Reuse the existing consent-enabled analytics session. A public CTA may lead
    // to an untagged signup page; the latest reviewed landing expires in 30 min.
    const landing = await db
      .prepare(
        `SELECT metadata FROM unified_events
      WHERE session_id = ? AND property = 'io' AND action = 'page_view'
        AND json_valid(metadata)
        AND json_extract(metadata, '$.newsletterMeasurement') IN ('first-party-v1', 'first-party-social-v1')
        AND julianday(created_at) >= julianday('now', '-30 minutes')
        AND julianday(created_at) <= julianday('now')
      ORDER BY julianday(created_at) DESC LIMIT 1`
      )
      .bind(input.sessionId)
      .first<{ metadata: string }>();
    if (landing) {
      try {
        const metadata = JSON.parse(landing.metadata) as Record<string, unknown>;
        const campaign =
          typeof metadata.newsletterCampaign === 'string'
            ? metadata.newsletterCampaign.replaceAll('_', '-')
            : '';
        const channel =
          metadata.newsletterMeasurement === 'first-party-v1'
            ? 'newsletter'
            : metadata.newsletterSource;
        if (channel === 'newsletter' && NEWSLETTER_CAMPAIGNS.some((id) => id === campaign))
          attribution = { edition: campaign, channel, campaign };
        else if (
          (channel === 'linkedin' || channel === 'substack') &&
          campaign === 'field-notes-20260928'
        )
          attribution = { edition: NEWSLETTER_CAMPAIGNS[0], channel, campaign };
        if (
          ['external', 'internal', 'test', 'automated', 'preview', 'unknown'].includes(
            String(metadata.trafficClass)
          )
        )
          trafficClass = String(metadata.trafficClass);
      } catch {
        /* Invalid metadata cannot become attribution. */
      }
    }
  }
  if (!attribution) return;
  await db
    .prepare(
      `INSERT INTO newsletter_signup_attributions
    (subscriber_id, confirmation_email_id, edition, channel, campaign, traffic_class, requested_at)
    SELECT id, ?, ?, ?, ?, ?, datetime('now') FROM newsletter_subscribers
    WHERE email = ? AND confirmation_email_id = ? AND confirmation_token = ? AND confirmed_at IS NULL
    ON CONFLICT(subscriber_id) DO UPDATE SET
      confirmation_email_id = excluded.confirmation_email_id,
      edition = excluded.edition, channel = excluded.channel, campaign = excluded.campaign,
      traffic_class = excluded.traffic_class, requested_at = excluded.requested_at
      WHERE newsletter_signup_attributions.confirmed_at IS NULL`
    )
    .bind(
      input.confirmationEmailId,
      attribution.edition,
      attribution.channel,
      attribution.campaign,
      trafficClass,
      input.email,
      input.confirmationEmailId,
      input.confirmationToken
    )
    .run();
}

export async function confirmNewsletterAttribution(
  db: NewsletterAttributionDatabase,
  subscriberId: number,
  context: NewsletterAttributionContext = {}
): Promise<(NewsletterAttribution & { traffic_class: string }) | null> {
  if (context.doNotTrack || context.userOptedOut) return null;
  // The confirmation transition and current provider receipt must both match.
  // RETURNING makes refreshes and concurrent confirmation requests count once.
  return db
    .prepare(
      `UPDATE newsletter_signup_attributions SET confirmed_at = datetime('now')
    WHERE subscriber_id = ? AND confirmed_at IS NULL
      AND EXISTS (SELECT 1 FROM newsletter_subscribers s WHERE s.id = subscriber_id
        AND s.confirmation_email_id = newsletter_signup_attributions.confirmation_email_id
        AND s.confirmed_at IS NOT NULL AND s.consent_evidence = 'confirmation_link'
        AND s.unsubscribed_at IS NULL AND s.active = 1 AND s.status = 'active')
    RETURNING edition, channel, campaign, traffic_class`
    )
    .bind(subscriberId)
    .first<NewsletterAttribution & { traffic_class: string }>();
}
