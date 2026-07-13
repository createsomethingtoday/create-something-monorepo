import type { ReminderJob } from '../application/booking-service.js';

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

  async sendReminder(job: ReminderJob): Promise<{ messageId: string }> {
    const response = await this.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': job.reminderId
      },
      body: JSON.stringify({
        from: this.from,
        to: [job.scheduler.email],
        subject: 'Your CREATE SOMETHING meeting starts in one hour',
        text: [
          `Hi ${job.scheduler.name},`,
          '',
          `Your meeting with Micah starts at ${job.slot.start} and ends at ${job.slot.end}.`,
          `Join with Google Meet: ${job.meetUrl}`,
          '',
          'CREATE SOMETHING'
        ].join('\n')
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
