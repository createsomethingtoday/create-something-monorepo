export interface NewsletterCheckInDatabase {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      run(): Promise<{ success: boolean }>;
    };
  };
}

export interface NewsletterCheckInInput {
  originalReason: string | null;
  stillInterested: 'yes' | 'not_sure' | 'no';
  updatesSeen: 'none' | 'some' | 'most';
  wantedNext: string | null;
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
): Promise<void> {
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
  await db
    .prepare(
      `INSERT INTO newsletter_reengagement_responses (
         id, campaign_id, subscriber_id, original_reason,
         still_interested, updates_seen, wanted_next, responded_at,
         retention_expires_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(campaign_id, subscriber_id) DO UPDATE SET
         original_reason = excluded.original_reason,
         still_interested = excluded.still_interested,
         updates_seen = excluded.updates_seen,
         wanted_next = excluded.wanted_next,
         retention_expires_at = excluded.retention_expires_at,
         updated_at = excluded.updated_at`
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
      respondedAt
    )
    .run();
}

function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new Error(`Keep this response under ${maxLength} characters.`);
  }
  return normalized;
}
