import {
  generateConfirmationEmailHtml,
  generateConfirmationEmailText
} from '@create-something/canon/newsletter/subscribe';

interface NewsletterConfirmationSubscriber {
  id: number;
  email: string;
  active: number;
  status: string;
  unsubscribed_at: string | null;
  confirmed_at: string | null;
  confirmation_token: string | null;
  consent_requested_at: string | null;
  consent_confirmed_at: string | null;
  consent_method: string | null;
  consent_evidence: string | null;
  confirmation_email_id: string | null;
  audience_classification: string | null;
}

interface NewsletterConfirmationRunResult {
  success: boolean;
  meta?: { changes?: number };
}

export interface NewsletterConfirmationDatabase {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      run(): Promise<NewsletterConfirmationRunResult>;
    };
  };
}

interface NewsletterConfirmationServices {
  apiKey: string;
  fetch: typeof globalThis.fetch;
  now?: () => Date;
  token?: () => string;
}

export interface NewsletterConfirmationReceipt {
  subscriberId: number;
  emailId: string;
  requestedAt: string;
}

export async function requestNewsletterDoubleOptIn(
  db: NewsletterConfirmationDatabase,
  input: { subscriberId: number },
  services: NewsletterConfirmationServices
): Promise<NewsletterConfirmationReceipt> {
  const subscriber = await db
    .prepare(
      `SELECT id, email, active, status, unsubscribed_at, confirmed_at, confirmation_token,
              consent_requested_at, consent_confirmed_at, consent_method, consent_evidence,
              confirmation_email_id, audience_classification
       FROM newsletter_subscribers WHERE id = ? LIMIT 1`
    )
    .bind(input.subscriberId)
    .first<NewsletterConfirmationSubscriber>();

  if (!subscriber) throw new Error('Subscriber not found.');
  if (subscriber.unsubscribed_at || subscriber.active !== 1 || subscriber.status !== 'active') {
    throw new Error('Suppressed subscribers cannot receive confirmation requests.');
  }
  if (
    subscriber.confirmed_at &&
    subscriber.consent_confirmed_at &&
    subscriber.consent_method === 'double_opt_in' &&
    subscriber.consent_evidence === 'confirmation_link'
  ) {
    throw new Error('Subscriber has already completed double opt-in.');
  }
  if (subscriber.audience_classification !== 'confirmed_subscriber') {
    throw new Error('Subscriber must be audience-reviewed before requesting confirmation.');
  }

  const requestedAt = (services.now ?? (() => new Date()))().toISOString();
  const confirmationToken = (services.token ?? createConfirmationToken)();
  const pending = await db
    .prepare(
      `UPDATE newsletter_subscribers
       SET confirmation_token = ?,
           confirmed_at = NULL,
           consent_requested_at = ?,
           consent_confirmed_at = NULL,
           consent_method = 'double_opt_in',
           consent_evidence = 'pending_confirmation',
           confirmation_email_id = NULL,
           updated_at = datetime('now')
       WHERE id = ? AND active = 1 AND status = 'active' AND unsubscribed_at IS NULL`
    )
    .bind(confirmationToken, requestedAt, subscriber.id)
    .run();

  if (!pending.success || Number(pending.meta?.changes ?? 0) !== 1) {
    throw new Error('Subscriber changed before the confirmation request could be prepared.');
  }

  const confirmUrl = `https://createsomething.io/confirm?token=${encodeURIComponent(confirmationToken)}`;
  let responseData: { id?: string };
  try {
    const response = await services.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${services.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `newsletter-confirmation-${subscriber.id}-${Date.parse(requestedAt)}`
      },
      body: JSON.stringify({
        from: 'CREATE SOMETHING <hello@createsomething.io>',
        to: subscriber.email,
        reply_to: 'micah@createsomething.io',
        subject: 'Confirm your subscription to CREATE SOMETHING',
        html: generateConfirmationEmailHtml(confirmUrl),
        text: generateConfirmationEmailText(confirmUrl)
      })
    });
    responseData = (await response.json()) as { id?: string };
    if (!response.ok || !responseData.id) throw new Error('Provider rejected confirmation email.');
  } catch {
    await restoreSubscriberConsent(db, subscriber, confirmationToken);
    throw new Error('Confirmation email could not be sent; the prior consent state was restored.');
  }

  const receipt = await db
    .prepare(
      `UPDATE newsletter_subscribers
       SET confirmation_email_id = ?, updated_at = datetime('now')
       WHERE id = ? AND confirmation_token = ?`
    )
    .bind(responseData.id, subscriber.id, confirmationToken)
    .run();
  if (!receipt.success || Number(receipt.meta?.changes ?? 0) !== 1) {
    throw new Error('Confirmation was sent, but its provider receipt could not be stored.');
  }

  return { subscriberId: subscriber.id, emailId: responseData.id, requestedAt };
}

async function restoreSubscriberConsent(
  db: NewsletterConfirmationDatabase,
  subscriber: NewsletterConfirmationSubscriber,
  confirmationToken: string
): Promise<void> {
  const restored = await db
    .prepare(
      `UPDATE newsletter_subscribers
       SET confirmed_at = ?, confirmation_token = ?, consent_requested_at = ?,
           consent_confirmed_at = ?, consent_method = ?, consent_evidence = ?,
           confirmation_email_id = ?, updated_at = datetime('now')
       WHERE id = ? AND confirmation_token = ? AND consent_evidence = 'pending_confirmation'`
    )
    .bind(
      subscriber.confirmed_at,
      subscriber.confirmation_token,
      subscriber.consent_requested_at,
      subscriber.consent_confirmed_at,
      subscriber.consent_method,
      subscriber.consent_evidence,
      subscriber.confirmation_email_id,
      subscriber.id,
      confirmationToken
    )
    .run();
  if (!restored.success || Number(restored.meta?.changes ?? 0) !== 1) {
    throw new Error(
      'Confirmation email could not be sent and the prior consent state could not be restored. Manual review is required.'
    );
  }
}

function createConfirmationToken(): string {
  return btoa(`confirm:${Date.now()}:${crypto.randomUUID()}`);
}
