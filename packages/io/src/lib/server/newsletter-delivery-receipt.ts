export interface NewsletterDeliveryReceiptDatabase {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<{ success: boolean }>;
    };
  };
}

export type NewsletterDeliveryEvent =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.suppressed'
  | 'email.opened'
  | 'email.clicked';

export async function recordNewsletterDeliveryReceipt(
  db: NewsletterDeliveryReceiptDatabase,
  resendEmailId: string,
  event: NewsletterDeliveryEvent
): Promise<void> {
  if (event === 'email.opened' || event === 'email.clicked') return;
  const status =
    event === 'email.delivered'
      ? 'delivered'
      : event === 'email.delivery_delayed'
        ? 'delayed'
        : event === 'email.bounced' || event === 'email.complained' || event === 'email.suppressed'
          ? 'failed'
          : 'sent';
  const errorCode =
    event === 'email.bounced' || event === 'email.complained' || event === 'email.suppressed'
      ? event
      : null;
  await db
    .prepare(
      `UPDATE newsletter_reengagement_deliveries
     SET status = CASE WHEN status = 'failed' THEN status ELSE ? END,
         delivered_at = CASE WHEN ? = 'delivered' AND status != 'failed' THEN datetime('now') ELSE delivered_at END,
         error_code = CASE WHEN status = 'failed' THEN error_code ELSE ? END,
         updated_at = datetime('now')
     WHERE resend_email_id = ?`
    )
    .bind(status, status, errorCode, resendEmailId)
    .run();
}
