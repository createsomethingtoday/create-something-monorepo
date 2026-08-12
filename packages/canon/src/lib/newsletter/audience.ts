export interface NewsletterAudienceRecord {
  confirmed_at: string | null;
  consent_confirmed_at: string | null;
  consent_method: string | null;
  consent_evidence: string | null;
  audience_classification: string | null;
  unsubscribed_at: string | null;
  active: number | null;
  status: string | null;
}

export type NewsletterEligibilityReason =
  | 'eligible'
  | 'unconfirmed'
  | 'consent_unproved'
  | 'audience_unreviewed'
  | 'suppressed';

export const ELIGIBLE_SUBSCRIBERS_SQL = `
  SELECT id, email, source, unsubscribe_token, consent_confirmed_at
  FROM newsletter_subscribers
  WHERE confirmed_at IS NOT NULL
    AND consent_confirmed_at IS NOT NULL
    AND consent_method = 'double_opt_in'
    AND consent_evidence = 'confirmation_link'
    AND audience_classification = 'confirmed_subscriber'
    AND unsubscribed_at IS NULL
    AND active = 1
    AND status = 'active'
  ORDER BY id ASC
`;

export function classifySubscriberEligibility(
  record: NewsletterAudienceRecord
): NewsletterEligibilityReason {
  if (record.unsubscribed_at || record.active !== 1 || record.status !== 'active') {
    return 'suppressed';
  }
  if (!record.confirmed_at) return 'unconfirmed';
  if (
    !record.consent_confirmed_at ||
    record.consent_method !== 'double_opt_in' ||
    record.consent_evidence !== 'confirmation_link'
  ) {
    return 'consent_unproved';
  }
  if (record.audience_classification !== 'confirmed_subscriber') {
    return 'audience_unreviewed';
  }
  return 'eligible';
}
