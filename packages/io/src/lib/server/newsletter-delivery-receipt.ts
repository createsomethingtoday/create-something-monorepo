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
        : event === 'email.bounced' || event === 'email.complained'
          ? 'failed'
          : 'sent';
  const errorCode = event === 'email.bounced' || event === 'email.complained' ? event : null;
  await db
    .prepare(
      `UPDATE newsletter_reengagement_deliveries
     SET status = ?,
         delivered_at = CASE WHEN ? = 'delivered' THEN datetime('now') ELSE delivered_at END,
         error_code = ?,
         updated_at = datetime('now')
     WHERE resend_email_id = ?`
    )
    .bind(status, status, errorCode, resendEmailId)
    .run();
}
