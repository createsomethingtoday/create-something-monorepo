export interface NewsletterLifecycleDatabase {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<{ success: boolean }>;
    };
  };
}

export { ELIGIBLE_SUBSCRIBERS_SQL } from '@create-something/canon/newsletter/audience';

export async function markNewsletterConfirmed(
  db: NewsletterLifecycleDatabase,
  subscriberId: number,
  confirmedAt = new Date().toISOString()
): Promise<void> {
  await db
    .prepare(
      `UPDATE newsletter_subscribers
       SET confirmed_at = COALESCE(confirmed_at, ?),
           consent_confirmed_at = COALESCE(consent_confirmed_at, ?),
           consent_method = 'double_opt_in',
           consent_evidence = 'confirmation_link',
           audience_classification = CASE
             WHEN audience_classification = 'legacy_or_unknown' THEN 'pending_review'
             ELSE audience_classification
           END,
           active = 1,
           status = 'active',
           unsubscribed_at = NULL,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(confirmedAt, confirmedAt, subscriberId)
    .run();
}
