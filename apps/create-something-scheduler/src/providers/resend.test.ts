import { describe, expect, it, vi } from 'vitest';
import type { ReminderJob } from '../application/booking-service.js';
import { ResendNotificationPort } from './resend.js';

const reminder: ReminderJob = {
  reminderId: 'reminder_controlled',
  receiptId: 'receipt_reminder_controlled',
  bookingId: 'booking_controlled',
  policyVersion: 'createsomething-together.v1',
  runAt: '2026-07-14T15:00:00Z',
  status: 'pending',
  scheduler: { name: 'Controlled Test', email: 'controlled@example.com' },
  slot: { start: '2026-07-14T16:00:00Z', end: '2026-07-14T16:30:00Z' },
  meetUrl: 'https://meet.google.com/reminder-test'
};

describe('ResendNotificationPort', () => {
  it('sends an idempotent reminder containing the meeting time and Meet URL', async () => {
    const fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        authorization: 'Bearer controlled-resend-key',
        'content-type': 'application/json',
        'idempotency-key': reminder.reminderId
      });
      expect(JSON.parse(String(init?.body))).toMatchObject({
        from: 'CREATE SOMETHING <noreply@createsomething.io>',
        to: [reminder.scheduler.email],
        subject: 'Your CREATE SOMETHING meeting starts in one hour'
      });
      expect(String(init?.body)).toContain(reminder.slot.start);
      expect(String(init?.body)).toContain(reminder.meetUrl);
      return Response.json({ id: 'resend-message-controlled' });
    });
    const port = new ResendNotificationPort({
      apiKey: 'controlled-resend-key',
      fetch
    });

    await expect(port.sendReminder(reminder)).resolves.toEqual({
      messageId: 'resend-message-controlled'
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('exposes provider failures without leaking the API key', async () => {
    const port = new ResendNotificationPort({
      apiKey: 'controlled-resend-key',
      fetch: vi.fn(async () => Response.json({ message: 'rate limited' }, { status: 429 }))
    });

    await expect(port.sendReminder(reminder)).rejects.toThrow('resend_retryable:429');
    await expect(port.sendReminder(reminder)).rejects.not.toThrow('controlled-resend-key');
  });

  it('invokes the runtime fetch function with the global receiver', async () => {
    const runtimeFetch = vi.fn(function (this: typeof globalThis) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(Response.json({ id: 'resend-message-controlled' }));
    });
    vi.stubGlobal('fetch', runtimeFetch);

    try {
      const port = new ResendNotificationPort({ apiKey: 'controlled-resend-key' });
      await expect(port.sendReminder(reminder)).resolves.toEqual({
        messageId: 'resend-message-controlled'
      });
      expect(runtimeFetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
