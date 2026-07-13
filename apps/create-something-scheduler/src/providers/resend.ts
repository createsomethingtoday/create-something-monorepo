import type {
  Booking,
  BookingNotificationJob
} from '../application/booking-service.js';
import { renderBookingEmail } from '../notifications/booking-email.js';

type ResendOptions = {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  from?: string;
};

export class ResendNotificationPort {
  private readonly fetch: typeof globalThis.fetch;
  private readonly from: string;

  constructor(private readonly options: ResendOptions) {
    this.fetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.from = options.from ?? 'CREATE SOMETHING <noreply@createsomething.io>';
  }

  async sendNotification(
    job: BookingNotificationJob,
    input: { booking: Booking; manageUrl: string }
  ): Promise<{ messageId: string }> {
    const rendered = renderBookingEmail({
      kind: job.kind,
      recipientName: input.booking.scheduler.name,
      slot: input.booking.slot,
      meetUrl: input.booking.provider.meetUrl,
      manageUrl: input.manageUrl,
      timezone: 'America/Chicago'
    });
    const response = await this.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': job.notificationId
      },
      body: JSON.stringify({
        from: this.from,
        to: [input.booking.scheduler.email],
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html
      })
    });

    if (!response.ok) {
      const classification = response.status === 429 || response.status >= 500
        ? 'retryable'
        : 'failed';
      throw new Error(`resend_${classification}:${response.status}`);
    }
    const body = await response.json() as { id?: unknown };
    if (typeof body.id !== 'string' || body.id.length === 0) {
      throw new Error('resend_retryable:invalid_response');
    }
    return { messageId: body.id };
  }
}
