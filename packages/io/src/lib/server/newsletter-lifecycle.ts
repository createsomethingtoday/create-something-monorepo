export interface NewsletterLifecycleDatabase {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
    };
  };
}

export { ELIGIBLE_SUBSCRIBERS_SQL } from '@create-something/canon/newsletter/audience';

export async function markNewsletterConfirmed(
  db: NewsletterLifecycleDatabase,
  subscriberId: number,
  confirmedAt = new Date().toISOString()
): Promise<boolean> {
  const result = await db
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
       WHERE id = ?
         AND unsubscribed_at IS NULL
         AND active = 1
         AND status = 'active'`
    )
    .bind(confirmedAt, confirmedAt, subscriberId)
    .run();
  return result.success && Number(result.meta?.changes ?? 0) === 1;
}
