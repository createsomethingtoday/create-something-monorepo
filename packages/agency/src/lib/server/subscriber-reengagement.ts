import { buildSubscriberReengagementEmail } from '@create-something/canon/newsletter/reengagement-email';

export const REENGAGEMENT_CAMPAIGN_ID = 'cre-1713-subscriber-check-in-v1';
export const REENGAGEMENT_CAMPAIGN_SLUG = 'subscriber-check-in-2026-08';
export const REENGAGEMENT_REPLY_TO = 'micah@createsomething.io';
const REENGAGEMENT_FROM = 'CREATE SOMETHING <hello@createsomething.io>';
const REENGAGEMENT_BASE_URL = 'https://createsomething.io';

export const REENGAGEMENT_ELIGIBLE_SUBSCRIBERS_SQL = `
  SELECT id, email, source, unsubscribe_token, consent_confirmed_at
  FROM newsletter_subscribers
  WHERE active = 1
    AND status = 'active'
    AND unsubscribed_at IS NULL
    AND confirmed_at IS NOT NULL
    AND audience_classification = 'confirmed_subscriber'
    AND (
      (
        consent_confirmed_at IS NOT NULL
        AND consent_method = 'double_opt_in'
        AND consent_evidence = 'confirmation_link'
      )
      OR
      (
        consent_requested_at IS NOT NULL
        AND consent_confirmed_at IS NULL
        AND consent_method = 'single_opt_in'
        AND consent_evidence = 'legacy_signup_form'
      )
    )
  ORDER BY id ASC
`;

export interface ReengagementAudienceSummary {
  total: number;
  eligible: number;
  excluded: number;
}

export interface ReengagementAudienceReceipt extends ReengagementAudienceSummary {
  directConfirmed: number;
  legacySingleOptIn: number;
  unconfirmed: number;
  consentUnproved: number;
  audienceUnreviewed: number;
  suppressed: number;
}

export interface ReengagementCampaignArtifact {
  id: string;
  slug: string;
  subject: string;
  preheader: string;
  htmlSnapshot: string;
  textSnapshot: string;
  contentHash: string;
  replyTo: string;
  eligibleCount: number;
  excludedCount: number;
}

export interface StoredReengagementCampaign extends ReengagementCampaignArtifact {
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  seedEmailId?: string | null;
  seedStatus?: string | null;
}

export interface EligibleReengagementSubscriber {
  id: number;
  email: string;
  unsubscribe_token: string;
}

export interface ReengagementCampaignStore {
  getCampaign(id: string): Promise<StoredReengagementCampaign | null>;
  getEligibleSubscribers(): Promise<EligibleReengagementSubscriber[]>;
  getDelivery(
    campaignId: string,
    subscriberId: number
  ): Promise<{ resendEmailId: string | null } | null>;
  queueDelivery(campaignId: string, subscriberId: number): Promise<void>;
  replaceCheckInToken(input: {
    campaignId: string;
    subscriberId: number;
    tokenHash: string;
    expiresAt: string;
  }): Promise<boolean>;
  markDeliverySent(campaignId: string, subscriberId: number, resendEmailId: string): Promise<void>;
  markDeliveryFailed(campaignId: string, subscriberId: number, errorCode: string): Promise<void>;
  setCampaignStatus(campaignId: string, status: 'sending' | 'sent' | 'stopped'): Promise<void>;
}

export interface ReengagementResendInput {
  apiKey: string;
  from?: string;
  baseUrl?: string;
  fetch: typeof globalThis.fetch;
}

export async function getReengagementAudienceReceipt(
  db: D1Database
): Promise<ReengagementAudienceReceipt> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS total,
            SUM(CASE WHEN reason IN ('direct_confirmed', 'legacy_single_opt_in') THEN 1 ELSE 0 END) AS eligible,
            SUM(CASE WHEN reason = 'direct_confirmed' THEN 1 ELSE 0 END) AS direct_confirmed,
            SUM(CASE WHEN reason = 'legacy_single_opt_in' THEN 1 ELSE 0 END) AS legacy_single_opt_in,
            SUM(CASE WHEN reason = 'unconfirmed' THEN 1 ELSE 0 END) AS unconfirmed,
            SUM(CASE WHEN reason = 'consent_unproved' THEN 1 ELSE 0 END) AS consent_unproved,
            SUM(CASE WHEN reason = 'audience_unreviewed' THEN 1 ELSE 0 END) AS audience_unreviewed,
            SUM(CASE WHEN reason = 'suppressed' THEN 1 ELSE 0 END) AS suppressed
     FROM (
       SELECT CASE
         WHEN unsubscribed_at IS NOT NULL
           OR COALESCE(active, 0) != 1
           OR COALESCE(status, '') != 'active' THEN 'suppressed'
         WHEN confirmed_at IS NULL THEN 'unconfirmed'
         WHEN COALESCE(audience_classification, '') = 'confirmed_subscriber'
           AND consent_confirmed_at IS NOT NULL
           AND consent_method = 'double_opt_in'
           AND consent_evidence = 'confirmation_link' THEN 'direct_confirmed'
         WHEN COALESCE(audience_classification, '') = 'confirmed_subscriber'
           AND consent_requested_at IS NOT NULL
           AND consent_confirmed_at IS NULL
           AND consent_method = 'single_opt_in'
           AND consent_evidence = 'legacy_signup_form' THEN 'legacy_single_opt_in'
         WHEN consent_confirmed_at IS NULL
           OR COALESCE(consent_method, '') NOT IN ('double_opt_in', 'single_opt_in')
           OR COALESCE(consent_evidence, '') NOT IN ('confirmation_link', 'legacy_signup_form') THEN 'consent_unproved'
         ELSE 'audience_unreviewed'
       END AS reason
       FROM newsletter_subscribers
     )`
    )
    .first<Record<string, number | null>>();
  const total = Number(row?.total ?? 0);
  const eligible = Number(row?.eligible ?? 0);
  return {
    total,
    eligible,
    excluded: total - eligible,
    directConfirmed: Number(row?.direct_confirmed ?? 0),
    legacySingleOptIn: Number(row?.legacy_single_opt_in ?? 0),
    unconfirmed: Number(row?.unconfirmed ?? 0),
    consentUnproved: Number(row?.consent_unproved ?? 0),
    audienceUnreviewed: Number(row?.audience_unreviewed ?? 0),
    suppressed: Number(row?.suppressed ?? 0)
  };
}

export async function prepareReengagementCampaign(
  db: D1Database,
  replyTo = REENGAGEMENT_REPLY_TO
): Promise<StoredReengagementCampaign> {
  const audience = await getReengagementAudienceReceipt(db);
  const eligibleSubscribers = await createD1ReengagementStore(db).getEligibleSubscribers();
  if (eligibleSubscribers.length !== audience.eligible) {
    throw new Error('Audience changed while preparing. Refresh and prepare again.');
  }
  const artifact = await buildReengagementCampaignArtifact({
    replyTo,
    audience,
    audienceMemberIds: eligibleSubscribers.map((subscriber) => subscriber.id)
  });
  await db
    .prepare(
      `INSERT INTO newsletter_reengagement_campaigns (
       id, slug, subject, preheader, html_snapshot, text_snapshot,
       content_hash, reply_to, status, eligible_count, excluded_count
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       subject = excluded.subject,
       preheader = excluded.preheader,
       html_snapshot = excluded.html_snapshot,
       text_snapshot = excluded.text_snapshot,
       content_hash = excluded.content_hash,
       reply_to = excluded.reply_to,
       status = 'draft',
       eligible_count = excluded.eligible_count,
       excluded_count = excluded.excluded_count,
       approved_by = NULL,
       approved_at = NULL,
       updated_at = datetime('now')
     WHERE newsletter_reengagement_campaigns.status IN ('draft', 'stopped', 'failed')`
    )
    .bind(
      artifact.id,
      artifact.slug,
      artifact.subject,
      artifact.preheader,
      artifact.htmlSnapshot,
      artifact.textSnapshot,
      artifact.contentHash,
      artifact.replyTo,
      artifact.eligibleCount,
      artifact.excludedCount
    )
    .run();
  return { ...artifact, status: 'draft' };
}

export async function approveReengagementCampaign(
  db: D1Database,
  input: { phrase: string; operatorEmail: string }
): Promise<void> {
  const campaign = await createD1ReengagementStore(db).getCampaign(REENGAGEMENT_CAMPAIGN_ID);
  if (!campaign) throw new Error('Prepare the campaign before approval.');
  if (input.phrase.trim() !== approvalPhraseFor(campaign)) {
    throw new Error('The approval phrase does not match the locked audience and message.');
  }
  const result = await db
    .prepare(
      `UPDATE newsletter_reengagement_campaigns
     SET status = 'approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND status IN ('draft', 'stopped') AND content_hash = ? AND eligible_count = ?`
    )
    .bind(input.operatorEmail, campaign.id, campaign.contentHash, campaign.eligibleCount)
    .run();
  if (!result.success || result.meta.changes !== 1) {
    throw new Error('Campaign approval was not recorded. Refresh the approval packet.');
  }
}

export async function stopReengagementCampaign(db: D1Database): Promise<void> {
  await db
    .prepare(
      `UPDATE newsletter_reengagement_campaigns
     SET status = 'stopped', stopped_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND status IN ('approved', 'sending')`
    )
    .bind(REENGAGEMENT_CAMPAIGN_ID)
    .run();
  await db
    .prepare(
      `UPDATE newsletter_reengagement_tokens
     SET revoked_at = COALESCE(revoked_at, datetime('now'))
     WHERE campaign_id = ?`
    )
    .bind(REENGAGEMENT_CAMPAIGN_ID)
    .run();
}

export function createD1ReengagementStore(db: D1Database): ReengagementCampaignStore {
  return {
    async getCampaign(id) {
      const row = await db
        .prepare(
          `SELECT id, slug, subject, preheader, html_snapshot, text_snapshot, content_hash,
                reply_to, status, eligible_count, excluded_count, approved_by, approved_at,
                seed_email_id, seed_status
         FROM newsletter_reengagement_campaigns WHERE id = ? LIMIT 1`
        )
        .bind(id)
        .first<Record<string, unknown>>();
      if (!row) return null;
      return {
        id: String(row.id),
        slug: String(row.slug),
        subject: String(row.subject),
        preheader: String(row.preheader),
        htmlSnapshot: String(row.html_snapshot),
        textSnapshot: String(row.text_snapshot),
        contentHash: String(row.content_hash),
        replyTo: String(row.reply_to),
        status: String(row.status),
        eligibleCount: Number(row.eligible_count),
        excludedCount: Number(row.excluded_count),
        approvedBy: row.approved_by ? String(row.approved_by) : null,
        approvedAt: row.approved_at ? String(row.approved_at) : null,
        seedEmailId: row.seed_email_id ? String(row.seed_email_id) : null,
        seedStatus: row.seed_status ? String(row.seed_status) : null
      };
    },
    async getEligibleSubscribers() {
      const result = await db
        .prepare(REENGAGEMENT_ELIGIBLE_SUBSCRIBERS_SQL)
        .all<EligibleReengagementSubscriber>();
      return result.results;
    },
    async getDelivery(campaignId, subscriberId) {
      const row = await db
        .prepare(
          `SELECT resend_email_id FROM newsletter_reengagement_deliveries
         WHERE campaign_id = ? AND subscriber_id = ? LIMIT 1`
        )
        .bind(campaignId, subscriberId)
        .first<{ resend_email_id: string | null }>();
      return row ? { resendEmailId: row.resend_email_id } : null;
    },
    async queueDelivery(campaignId, subscriberId) {
      await db
        .prepare(
          `INSERT INTO newsletter_reengagement_deliveries (id, campaign_id, subscriber_id, status)
         VALUES (?, ?, ?, 'queued')
         ON CONFLICT(campaign_id, subscriber_id) DO UPDATE SET
           status = CASE WHEN resend_email_id IS NULL THEN 'queued' ELSE status END,
           error_code = CASE WHEN resend_email_id IS NULL THEN NULL ELSE error_code END,
           updated_at = datetime('now')`
        )
        .bind(crypto.randomUUID(), campaignId, subscriberId)
        .run();
    },
    async replaceCheckInToken(input) {
      await db
        .prepare(
          `DELETE FROM newsletter_reengagement_tokens
         WHERE campaign_id = ? AND subscriber_id = ?
           AND NOT EXISTS (
             SELECT 1 FROM newsletter_reengagement_deliveries d
             WHERE d.campaign_id = ? AND d.subscriber_id = ? AND d.resend_email_id IS NOT NULL
           )`
        )
        .bind(input.campaignId, input.subscriberId, input.campaignId, input.subscriberId)
        .run();
      const result = await db
        .prepare(
          `INSERT INTO newsletter_reengagement_tokens
         (id, campaign_id, subscriber_id, token_hash, expires_at)
         SELECT ?, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM newsletter_reengagement_campaigns
           WHERE id = ? AND status = 'sending'
         )`
        )
        .bind(
          crypto.randomUUID(),
          input.campaignId,
          input.subscriberId,
          input.tokenHash,
          input.expiresAt,
          input.campaignId
        )
        .run();
      return result.success && result.meta.changes === 1;
    },
    async markDeliverySent(campaignId, subscriberId, resendEmailId) {
      await db
        .prepare(
          `UPDATE newsletter_reengagement_deliveries
         SET resend_email_id = ?, status = 'sent', sent_at = datetime('now'), updated_at = datetime('now')
         WHERE campaign_id = ? AND subscriber_id = ? AND resend_email_id IS NULL`
        )
        .bind(resendEmailId, campaignId, subscriberId)
        .run();
    },
    async markDeliveryFailed(campaignId, subscriberId, errorCode) {
      await db
        .prepare(
          `UPDATE newsletter_reengagement_deliveries
         SET status = 'failed', error_code = ?, updated_at = datetime('now')
         WHERE campaign_id = ? AND subscriber_id = ? AND resend_email_id IS NULL`
        )
        .bind(errorCode, campaignId, subscriberId)
        .run();
    },
    async setCampaignStatus(campaignId, status) {
      await db
        .prepare(
          `UPDATE newsletter_reengagement_campaigns
         SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN datetime('now') ELSE sent_at END,
             stopped_at = CASE WHEN ? = 'stopped' THEN datetime('now') ELSE stopped_at END,
             updated_at = datetime('now')
         WHERE id = ?
           AND (
             ? = 'stopped'
             OR (? = 'sending' AND status IN ('approved', 'sending'))
             OR (? = 'sent' AND status = 'sending')
           )`
        )
        .bind(status, status, status, campaignId, status, status, status)
        .run();
    }
  };
}

export async function sendReengagementSeed(
  db: D1Database,
  input: ReengagementResendInput & { recipient: string }
): Promise<string> {
  const campaign = await createD1ReengagementStore(db).getCampaign(REENGAGEMENT_CAMPAIGN_ID);
  if (!campaign) throw new Error('Prepare the campaign before sending a seed.');
  const email = buildSubscriberReengagementEmail({
    checkInUrl: `${input.baseUrl ?? REENGAGEMENT_BASE_URL}/check-in?preview=operator-seed`,
    unsubscribeUrl: `${input.baseUrl ?? REENGAGEMENT_BASE_URL}/unsubscribe?preview=operator-seed`
  });
  const response = await callProviderFetch(input.fetch, 'https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `${campaign.id}-operator-seed-${campaign.contentHash.slice(0, 12)}`
    },
    body: JSON.stringify({
      from: input.from ?? REENGAGEMENT_FROM,
      to: input.recipient,
      reply_to: campaign.replyTo,
      subject: `[SEED] ${email.subject}`,
      html: email.html,
      text: email.text,
      tags: [{ name: 'campaign', value: 'subscriber-check-in-seed' }]
    })
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; name?: string };
  if (!response.ok || !body.id)
    throw new Error(body.name ?? `Seed failed with HTTP ${response.status}.`);
  await db
    .prepare(
      `UPDATE newsletter_reengagement_campaigns
     SET seed_email_id = ?, seed_status = 'sent', seed_recipient_hash = ?,
         seed_sent_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`
    )
    .bind(body.id, await sha256Hex(input.recipient.toLowerCase()), campaign.id)
    .run();
  return body.id;
}

export async function syncReengagementDeliveryReceipts(
  db: D1Database,
  input: { apiKey: string; fetch: typeof globalThis.fetch }
): Promise<{ checked: number; delivered: number; failed: number }> {
  const campaign = await createD1ReengagementStore(db).getCampaign(REENGAGEMENT_CAMPAIGN_ID);
  const deliveries = await db
    .prepare(
      `SELECT resend_email_id FROM newsletter_reengagement_deliveries
     WHERE campaign_id = ? AND resend_email_id IS NOT NULL`
    )
    .bind(REENGAGEMENT_CAMPAIGN_ID)
    .all<{ resend_email_id: string }>();
  const ids = [
    campaign?.seedEmailId ?? null,
    ...deliveries.results.map((row) => row.resend_email_id)
  ].filter((value): value is string => Boolean(value));
  let delivered = 0;
  let failed = 0;

  for (const resendEmailId of ids) {
    const response = await callProviderFetch(
      input.fetch,
      `https://api.resend.com/emails/${encodeURIComponent(resendEmailId)}`,
      {
        headers: { Authorization: `Bearer ${input.apiKey}` }
      }
    );
    if (!response.ok) {
      failed += 1;
      continue;
    }
    const body = (await response.json()) as { last_event?: string };
    const status = normalizeResendLastEvent(body.last_event);
    if (status === 'delivered') delivered += 1;
    if (status === 'failed') failed += 1;
    await db
      .prepare(
        `UPDATE newsletter_reengagement_deliveries
       SET status = ?,
           delivered_at = CASE WHEN ? = 'delivered' THEN COALESCE(delivered_at, datetime('now')) ELSE delivered_at END,
           error_code = CASE WHEN ? = 'failed' THEN 'provider_delivery_failure' ELSE NULL END,
           updated_at = datetime('now')
       WHERE resend_email_id = ?`
      )
      .bind(status, status, status, resendEmailId)
      .run();
    await db
      .prepare(
        `UPDATE newsletter_reengagement_campaigns
       SET seed_status = ?, updated_at = datetime('now')
       WHERE id = ? AND seed_email_id = ?`
      )
      .bind(status, REENGAGEMENT_CAMPAIGN_ID, resendEmailId)
      .run();
  }
  return { checked: ids.length, delivered, failed };
}

export function normalizeResendLastEvent(event: string | undefined): string {
  if (event === 'delivered') return 'delivered';
  if (event === 'bounced' || event === 'complained' || event === 'failed') return 'failed';
  if (event === 'delivery_delayed') return 'delayed';
  return 'sent';
}

export async function buildReengagementCampaignArtifact(input: {
  replyTo: string;
  audience: ReengagementAudienceSummary;
  audienceMemberIds: number[];
}): Promise<ReengagementCampaignArtifact> {
  const email = buildSubscriberReengagementEmail({
    checkInUrl: '{{CHECK_IN_URL}}',
    unsubscribeUrl: '{{UNSUBSCRIBE_URL}}'
  });
  const contentHash = await sha256Hex(
    JSON.stringify({
      subject: email.subject,
      preheader: email.preheader,
      html: email.html,
      text: email.text,
      replyTo: input.replyTo,
      audienceMemberIds: [...new Set(input.audienceMemberIds)].sort((a, b) => a - b)
    })
  );

  return {
    id: REENGAGEMENT_CAMPAIGN_ID,
    slug: REENGAGEMENT_CAMPAIGN_SLUG,
    subject: email.subject,
    preheader: email.preheader,
    htmlSnapshot: email.html,
    textSnapshot: email.text,
    contentHash,
    replyTo: input.replyTo,
    eligibleCount: input.audience.eligible,
    excludedCount: input.audience.excluded
  };
}

export function approvalPhraseFor(campaign: ReengagementCampaignArtifact): string {
  const noun = campaign.eligibleCount === 1 ? 'RECIPIENT' : 'RECIPIENTS';
  return `APPROVE ${campaign.eligibleCount} ${noun} ${campaign.contentHash.slice(0, 12)}`;
}

export async function sendApprovedReengagementCampaign(
  store: ReengagementCampaignStore,
  input: ReengagementResendInput
): Promise<{ sent: number; skipped: number }> {
  const campaign = await store.getCampaign(REENGAGEMENT_CAMPAIGN_ID);
  if (!campaign || !['approved', 'sending', 'sent'].includes(campaign.status)) {
    throw new Error('The campaign has not been explicitly approved.');
  }

  const subscribers = await store.getEligibleSubscribers();
  if (subscribers.length !== campaign.eligibleCount) {
    throw new Error('Audience changed after approval. Prepare and approve it again.');
  }

  const locked = await buildReengagementCampaignArtifact({
    replyTo: campaign.replyTo,
    audience: {
      total: campaign.eligibleCount + campaign.excludedCount,
      eligible: campaign.eligibleCount,
      excluded: campaign.excludedCount
    },
    audienceMemberIds: subscribers.map((subscriber) => subscriber.id)
  });
  if (locked.contentHash !== campaign.contentHash) {
    throw new Error('Audience or campaign content changed after approval. Prepare and approve it again.');
  }

  await store.setCampaignStatus(campaign.id, 'sending');
  let sent = 0;
  let skipped = 0;

  for (const subscriber of subscribers) {
    const currentCampaign = await store.getCampaign(campaign.id);
    if (!currentCampaign || currentCampaign.status !== 'sending') {
      throw new Error('Campaign was stopped; no further deliveries were attempted.');
    }
    const existing = await store.getDelivery(campaign.id, subscriber.id);
    if (existing?.resendEmailId) {
      skipped += 1;
      continue;
    }

    await store.queueDelivery(campaign.id, subscriber.id);
    const rawToken = await deterministicCheckInToken(
      campaign.id,
      subscriber.unsubscribe_token
    );
    const tokenReady = await store.replaceCheckInToken({
      campaignId: campaign.id,
      subscriberId: subscriber.id,
      tokenHash: await sha256Hex(rawToken),
      expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()
    });
    if (!tokenReady) {
      throw new Error('Campaign was stopped; no further deliveries were attempted.');
    }

    const beforeProviderCall = await store.getCampaign(campaign.id);
    if (!beforeProviderCall || beforeProviderCall.status !== 'sending') {
      throw new Error('Campaign was stopped; no further deliveries were attempted.');
    }

    const baseUrl = input.baseUrl ?? REENGAGEMENT_BASE_URL;
    const checkInUrl = `${baseUrl}/check-in?token=${encodeURIComponent(rawToken)}`;
    const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`;
    const email = buildSubscriberReengagementEmail({ checkInUrl, unsubscribeUrl });
    const response = await callProviderFetch(input.fetch, 'https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `${campaign.id}-${subscriber.id}`
      },
      body: JSON.stringify({
        from: input.from ?? REENGAGEMENT_FROM,
        to: subscriber.email,
        reply_to: campaign.replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [
          { name: 'campaign', value: 'subscriber-check-in' },
          { name: 'campaign_id', value: campaign.id }
        ]
      })
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; name?: string };
    if (!response.ok || !body.id) {
      const errorCode = body.name ?? `resend_http_${response.status}`;
      await store.markDeliveryFailed(campaign.id, subscriber.id, errorCode);
      await store.setCampaignStatus(campaign.id, 'stopped');
      throw new Error(`Campaign stopped after a delivery error: ${errorCode}`);
    }

    await store.markDeliverySent(campaign.id, subscriber.id, body.id);
    sent += 1;
  }

  const beforeCompletion = await store.getCampaign(campaign.id);
  if (!beforeCompletion || beforeCompletion.status !== 'sending') {
    throw new Error('Campaign was stopped; no further deliveries were attempted.');
  }
  await store.setCampaignStatus(campaign.id, 'sent');
  return { sent, skipped };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function callProviderFetch(
  fetcher: typeof globalThis.fetch,
  input: Parameters<typeof globalThis.fetch>[0],
  init?: Parameters<typeof globalThis.fetch>[1]
): ReturnType<typeof globalThis.fetch> {
  return fetcher.call(globalThis, input, init);
}

export async function deterministicCheckInToken(
  campaignId: string,
  unsubscribeToken: string
): Promise<string> {
  return sha256Hex(`newsletter-check-in:${campaignId}:${unsubscribeToken}`);
}
