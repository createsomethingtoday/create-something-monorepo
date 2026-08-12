export interface NewsletterCheckInDatabase {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
    };
  };
}

export interface NewsletterCheckInInput {
  originalReason: string | null;
  stillInterested: 'yes' | 'not_sure' | 'no';
  updatesSeen: 'none' | 'some' | 'most';
  wantedNext: string | null;
}

interface NewsletterCheckInFollowUpRow extends NewsletterCheckInInput {
  email: string;
  responseFingerprint: string;
  notificationStatus: string;
  warmLeadStatus: string;
}

export interface NewsletterCheckInFollowUpServices {
  apiKey: string;
  fetch: typeof globalThis.fetch;
  warmLead: (
    db: NewsletterCheckInDatabase,
    input: {
      name: string;
      email: string;
      source: 'website';
      sourceDetail: string;
      campaign: string;
      stage: 'awareness' | 'consideration';
      serviceInterest: string;
      notes: string;
      touchedAt: string;
    }
  ) => Promise<{ id: string }>;
}

interface CheckInRow {
  token_id: string;
  campaign_id: string;
  subscriber_id: number;
  expires_at: string;
  revoked_at: string | null;
  campaign_status: string;
  subscriber_status: string | null;
  active: number | null;
  unsubscribed_at: string | null;
  unsubscribe_token: string;
  original_reason: string | null;
  still_interested: NewsletterCheckInInput['stillInterested'] | null;
  updates_seen: NewsletterCheckInInput['updatesSeen'] | null;
  wanted_next: string | null;
  responded_at: string | null;
}

export type NewsletterCheckInResult =
  | { state: 'invalid'; unsubscribeToken: null }
  | { state: 'expired' | 'revoked' | 'unsubscribed'; unsubscribeToken: string }
  | {
      state: 'ready';
      campaignId: string;
      subscriberId: number;
      unsubscribeToken: string;
      response: NewsletterCheckInInput | null;
      respondedAt: string | null;
    };

export async function hashNewsletterCheckInToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function loadNewsletterCheckIn(
  db: NewsletterCheckInDatabase,
  token: string,
  now = new Date()
): Promise<NewsletterCheckInResult> {
  const normalizedToken = token.trim();
  if (!normalizedToken) return { state: 'invalid', unsubscribeToken: null };

  const tokenHash = await hashNewsletterCheckInToken(normalizedToken);
  const row = await db
    .prepare(
      `SELECT t.id AS token_id,
              t.campaign_id,
              t.subscriber_id,
              t.expires_at,
              t.revoked_at,
              c.status AS campaign_status,
              s.status AS subscriber_status,
              s.active,
              s.unsubscribed_at,
              s.unsubscribe_token,
              r.original_reason,
              r.still_interested,
              r.updates_seen,
              r.wanted_next,
              r.responded_at
       FROM newsletter_reengagement_tokens t
       JOIN newsletter_reengagement_campaigns c ON c.id = t.campaign_id
       JOIN newsletter_subscribers s ON s.id = t.subscriber_id
       LEFT JOIN newsletter_reengagement_responses r
         ON r.campaign_id = t.campaign_id AND r.subscriber_id = t.subscriber_id
       WHERE t.token_hash = ?
       LIMIT 1`
    )
    .bind(tokenHash)
    .first<CheckInRow>();

  if (!row) return { state: 'invalid', unsubscribeToken: null };
  if (row.revoked_at) return { state: 'revoked', unsubscribeToken: row.unsubscribe_token };
  if (new Date(row.expires_at).getTime() <= now.getTime()) {
    return { state: 'expired', unsubscribeToken: row.unsubscribe_token };
  }
  if (row.unsubscribed_at || row.active !== 1 || (row.subscriber_status ?? 'active') !== 'active') {
    return { state: 'unsubscribed', unsubscribeToken: row.unsubscribe_token };
  }
  if (!['approved', 'sending', 'sent'].includes(row.campaign_status)) {
    return { state: 'invalid', unsubscribeToken: null };
  }

  const openedAt = now.toISOString();
  await db
    .prepare(
      `UPDATE newsletter_reengagement_tokens
       SET first_opened_at = COALESCE(first_opened_at, ?),
           last_opened_at = ?
       WHERE id = ?`
    )
    .bind(openedAt, openedAt, row.token_id)
    .run();

  return {
    state: 'ready',
    campaignId: row.campaign_id,
    subscriberId: row.subscriber_id,
    unsubscribeToken: row.unsubscribe_token,
    response:
      row.still_interested && row.updates_seen
        ? {
            originalReason: row.original_reason,
            stillInterested: row.still_interested,
            updatesSeen: row.updates_seen,
            wantedNext: row.wanted_next
          }
        : null,
    respondedAt: row.responded_at
  };
}

export function validateNewsletterCheckInInput(
  input: Record<string, unknown>
): NewsletterCheckInInput {
  const stillInterested = String(input.stillInterested ?? '');
  const updatesSeen = String(input.updatesSeen ?? '');
  if (!['yes', 'not_sure', 'no'].includes(stillInterested)) {
    throw new Error('Choose whether the notes are still useful.');
  }
  if (!['none', 'some', 'most'].includes(updatesSeen)) {
    throw new Error('Choose how much of the recent work you have seen.');
  }

  return {
    originalReason: normalizeOptionalText(input.originalReason, 500),
    stillInterested: stillInterested as NewsletterCheckInInput['stillInterested'],
    updatesSeen: updatesSeen as NewsletterCheckInInput['updatesSeen'],
    wantedNext: normalizeOptionalText(input.wantedNext, 1000)
  };
}

export async function saveNewsletterCheckIn(
  db: NewsletterCheckInDatabase,
  context: { campaignId: string; subscriberId: number },
  input: NewsletterCheckInInput,
  respondedAt = new Date().toISOString()
): Promise<string> {
  await db
    .prepare(
      `DELETE FROM newsletter_reengagement_responses
       WHERE retention_expires_at <= datetime('now')`
    )
    .bind()
    .run();
  const retentionExpiresAt = new Date(
    new Date(respondedAt).getTime() + 365 * 24 * 60 * 60 * 1000
  ).toISOString();
  const responseFingerprint = await hashNewsletterCheckInToken(
    JSON.stringify([
      input.originalReason,
      input.stillInterested,
      input.updatesSeen,
      input.wantedNext
    ])
  );
  const warmLeadStatus = input.stillInterested === 'no' ? 'not_applicable' : 'pending';
  await db
    .prepare(
      `INSERT INTO newsletter_reengagement_responses (
         id, campaign_id, subscriber_id, original_reason,
         still_interested, updates_seen, wanted_next, responded_at,
         retention_expires_at, updated_at, response_fingerprint,
         notification_status, warm_lead_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
       ON CONFLICT(campaign_id, subscriber_id) DO UPDATE SET
         original_reason = excluded.original_reason,
         still_interested = excluded.still_interested,
         updates_seen = excluded.updates_seen,
         wanted_next = excluded.wanted_next,
         retention_expires_at = excluded.retention_expires_at,
         updated_at = excluded.updated_at,
         response_fingerprint = excluded.response_fingerprint,
         notification_status = CASE
           WHEN newsletter_reengagement_responses.response_fingerprint IS NOT excluded.response_fingerprint
             THEN 'pending'
           ELSE newsletter_reengagement_responses.notification_status
         END,
         notification_email_id = CASE
           WHEN newsletter_reengagement_responses.response_fingerprint IS NOT excluded.response_fingerprint
             THEN NULL
           ELSE newsletter_reengagement_responses.notification_email_id
         END,
         notified_at = CASE
           WHEN newsletter_reengagement_responses.response_fingerprint IS NOT excluded.response_fingerprint
             THEN NULL
           ELSE newsletter_reengagement_responses.notified_at
         END,
         warm_lead_status = CASE
           WHEN newsletter_reengagement_responses.response_fingerprint IS NOT excluded.response_fingerprint
             THEN excluded.warm_lead_status
           ELSE newsletter_reengagement_responses.warm_lead_status
         END,
         warm_lead_id = CASE
           WHEN newsletter_reengagement_responses.response_fingerprint IS NOT excluded.response_fingerprint
             THEN NULL
           ELSE newsletter_reengagement_responses.warm_lead_id
         END,
         notification_error = CASE
           WHEN newsletter_reengagement_responses.response_fingerprint IS NOT excluded.response_fingerprint
             THEN NULL
           ELSE newsletter_reengagement_responses.notification_error
         END,
         warm_lead_error = CASE
           WHEN newsletter_reengagement_responses.response_fingerprint IS NOT excluded.response_fingerprint
             THEN NULL
           ELSE newsletter_reengagement_responses.warm_lead_error
         END`
    )
    .bind(
      crypto.randomUUID(),
      context.campaignId,
      context.subscriberId,
      input.originalReason,
      input.stillInterested,
      input.updatesSeen,
      input.wantedNext,
      respondedAt,
      retentionExpiresAt,
      respondedAt,
      responseFingerprint,
      warmLeadStatus
    )
    .run();
  return responseFingerprint;
}

export async function dispatchNewsletterCheckInFollowUp(
  db: NewsletterCheckInDatabase,
  context: { campaignId: string; subscriberId: number },
  responseFingerprint: string,
  services: NewsletterCheckInFollowUpServices
): Promise<{
  notification: 'sent' | 'failed' | 'skipped';
  warmLead: 'updated' | 'failed' | 'skipped';
}> {
  const row = await db
    .prepare(
      `SELECT s.email,
              r.original_reason AS originalReason,
              r.still_interested AS stillInterested,
              r.updates_seen AS updatesSeen,
              r.wanted_next AS wantedNext,
              r.response_fingerprint AS responseFingerprint,
              r.notification_status AS notificationStatus,
              r.warm_lead_status AS warmLeadStatus
       FROM newsletter_reengagement_responses r
       JOIN newsletter_subscribers s ON s.id = r.subscriber_id
       WHERE r.campaign_id = ? AND r.subscriber_id = ?
       LIMIT 1`
    )
    .bind(context.campaignId, context.subscriberId)
    .first<NewsletterCheckInFollowUpRow>();
  if (!row || row.responseFingerprint !== responseFingerprint) {
    return { notification: 'skipped', warmLead: 'skipped' };
  }

  let warmLead: 'updated' | 'failed' | 'skipped' = 'skipped';
  if (row.stillInterested !== 'no' && row.warmLeadStatus !== 'updated') {
    const warmLeadClaim = await db
      .prepare(
        `UPDATE newsletter_reengagement_responses
         SET warm_lead_status = 'updating', warm_lead_error = NULL, updated_at = datetime('now')
         WHERE campaign_id = ? AND subscriber_id = ? AND response_fingerprint = ?
           AND (
             warm_lead_status IN ('pending', 'failed')
             OR (warm_lead_status = 'updating' AND updated_at <= datetime('now', '-10 minutes'))
           )`
      )
      .bind(context.campaignId, context.subscriberId, responseFingerprint)
      .run();
    if (Number(warmLeadClaim.meta?.changes ?? 0) === 1)
      try {
        const lead = await services.warmLead(db, {
          name: 'Newsletter subscriber',
          email: row.email,
          source: 'website',
          sourceDetail: 'newsletter:subscriber-check-in',
          campaign: context.campaignId,
          stage: row.stillInterested === 'yes' ? 'consideration' : 'awareness',
          serviceInterest: 'newsletter',
          notes: buildWarmLeadNote(row, responseFingerprint),
          touchedAt: new Date().toISOString()
        });
        await db
          .prepare(
            `UPDATE newsletter_reengagement_responses
           SET warm_lead_status = 'updated', warm_lead_id = ?, warm_lead_error = NULL,
               updated_at = datetime('now')
           WHERE campaign_id = ? AND subscriber_id = ? AND response_fingerprint = ?`
          )
          .bind(lead.id, context.campaignId, context.subscriberId, responseFingerprint)
          .run();
        warmLead = 'updated';
      } catch {
        await recordFollowUpFailure(db, context, responseFingerprint, 'warm_lead_failed');
        warmLead = 'failed';
      }
  }

  const claim = await db
    .prepare(
      `UPDATE newsletter_reengagement_responses
       SET notification_status = 'sending', notification_error = NULL, updated_at = datetime('now')
       WHERE campaign_id = ? AND subscriber_id = ? AND response_fingerprint = ?
         AND (
           notification_status IN ('pending', 'failed')
           OR (notification_status = 'sending' AND updated_at <= datetime('now', '-10 minutes'))
         )`
    )
    .bind(context.campaignId, context.subscriberId, responseFingerprint)
    .run();
  if (Number(claim.meta?.changes ?? 0) !== 1) {
    return { notification: 'skipped', warmLead };
  }

  const notification = buildOperatorNotification(row);
  try {
    const notificationId = await sendOperatorNotification(services, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${services.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `${context.campaignId}-response-${context.subscriberId}-${responseFingerprint.slice(0, 12)}`
      },
      body: JSON.stringify({
        from: 'CREATE SOMETHING <hello@createsomething.io>',
        to: 'micah@createsomething.io',
        reply_to: row.email,
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
        tags: [
          { name: 'campaign', value: 'subscriber-check-in-response' },
          { name: 'interest', value: row.stillInterested }
        ]
      })
    });
    if (!notificationId) throw new Error('notification_delivery_failed');
    await db
      .prepare(
        `UPDATE newsletter_reengagement_responses
         SET notification_status = 'sent', notification_email_id = ?,
             notified_at = datetime('now'), notification_error = NULL, updated_at = datetime('now')
         WHERE campaign_id = ? AND subscriber_id = ? AND response_fingerprint = ?`
      )
      .bind(notificationId, context.campaignId, context.subscriberId, responseFingerprint)
      .run();
    return { notification: 'sent', warmLead };
  } catch {
    await db
      .prepare(
        `UPDATE newsletter_reengagement_responses
         SET notification_status = 'failed', notification_error = 'notification_failed',
             updated_at = datetime('now')
         WHERE campaign_id = ? AND subscriber_id = ? AND response_fingerprint = ?`
      )
      .bind(context.campaignId, context.subscriberId, responseFingerprint)
      .run();
    return { notification: 'failed', warmLead };
  }
}

function buildOperatorNotification(row: NewsletterCheckInFollowUpRow) {
  const interestLabel =
    row.stillInterested === 'yes'
      ? 'Still interested'
      : row.stillInterested === 'not_sure'
        ? 'Not sure yet'
        : 'Not interested';
  const originalReason = row.originalReason ?? 'No answer';
  const wantedNext = row.wantedNext ?? 'No answer';
  const text = `Subscriber check-in response\n\nInterest: ${interestLabel}\nUpdates seen: ${row.updatesSeen}\n\nWhy they joined:\n${originalReason}\n\nWhat they want next:\n${wantedNext}\n\nReview responses: https://createsomething.agency/admin/subscriber-reengagement`;
  const html = `<h1>Subscriber check-in response</h1><p><strong>Interest:</strong> ${escapeHtml(interestLabel)}<br><strong>Updates seen:</strong> ${escapeHtml(row.updatesSeen)}</p><h2>Why they joined</h2><p>${escapeHtml(originalReason)}</p><h2>What they want next</h2><p>${escapeHtml(wantedNext)}</p><p><a href="https://createsomething.agency/admin/subscriber-reengagement">Review responses</a></p>`;
  return { subject: `[Subscriber check-in] ${interestLabel}`, text, html };
}

function buildWarmLeadNote(row: NewsletterCheckInFollowUpRow, fingerprint: string): string {
  return `Subscriber check-in ${fingerprint.slice(0, 12)}: interest=${row.stillInterested}; updates_seen=${row.updatesSeen}; why_joined=${row.originalReason ?? 'not provided'}; wanted_next=${row.wantedNext ?? 'not provided'}.`;
}

async function sendOperatorNotification(
  services: NewsletterCheckInFollowUpServices,
  request: RequestInit
): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await services.fetch.call(
        globalThis,
        'https://api.resend.com/emails',
        request
      );
      const body = (await response.json().catch(() => ({}))) as { id?: string };
      if (response.ok && body.id) return body.id;
      if (response.status !== 429 && response.status < 500) return null;
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}

async function recordFollowUpFailure(
  db: NewsletterCheckInDatabase,
  context: { campaignId: string; subscriberId: number },
  responseFingerprint: string,
  errorCode: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE newsletter_reengagement_responses
       SET warm_lead_status = 'failed', warm_lead_error = ?, updated_at = datetime('now')
       WHERE campaign_id = ? AND subscriber_id = ? AND response_fingerprint = ?`
    )
    .bind(errorCode, context.campaignId, context.subscriberId, responseFingerprint)
    .run();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new Error(`Keep this response under ${maxLength} characters.`);
  }
  return normalized;
}
