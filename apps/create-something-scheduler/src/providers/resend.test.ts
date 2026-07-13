import { describe, expect, it, vi } from 'vitest';
import { ResendNotificationPort } from './resend.js';

const notification = {
  notificationId: 'notification_reminder_controlled',
  receiptId: 'receipt_notification_reminder_controlled',
  bookingId: 'booking_controlled',
  slotStart: '2026-07-14T16:00:00Z',
  kind: 'reminder' as const,
  policyVersion: 'createsomething-together.v1',
  runAt: '2026-07-14T15:00:00Z',
  status: 'pending' as const
};

const booking = {
  bookingId: 'booking_controlled',
  proposalId: 'proposal_controlled',
  status: 'committed' as const,
  scheduler: { name: 'Controlled Test', email: 'controlled@example.com' },
  slot: { start: '2026-07-14T16:00:00Z', end: '2026-07-14T16:30:00Z' },
  provider: {
    eventId: 'event_controlled',
    meetUrl: 'https://meet.google.com/reminder-test'
  }
};

const delivery = {
  booking,
  manageUrl:
    'https://createsomething.agency/book?booking=booking_controlled#access=controlled-action-token'
};

describe('ResendNotificationPort', () => {
  it('sends Performance HTML and aligned text without persisting the management credential', async () => {
    const fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        'idempotency-key': notification.notificationId
      });
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body).toMatchObject({
        subject: 'Your CREATE SOMETHING meeting starts in one hour'
      });
      expect(body.html).toContain('background-color:#f3f3f0');
      expect(body.html).toContain('Manage this meeting');
      expect(body.text).toContain('Manage this meeting:');
      expect(body.html).toContain('#access=controlled-action-token');
      return Response.json({ id: 'resend-message-performance' });
    });
    const port = new ResendNotificationPort({ apiKey: 'controlled-resend-key', fetch });

    await expect(port.sendNotification(notification, delivery)).resolves.toEqual({
      messageId: 'resend-message-performance'
    });
    expect(JSON.stringify(notification)).not.toContain('controlled-action-token');
  });

  it('exposes provider failures without leaking the API key', async () => {
    const port = new ResendNotificationPort({
      apiKey: 'controlled-resend-key',
      fetch: vi.fn(async () => Response.json({ message: 'rate limited' }, { status: 429 }))
    });

    await expect(port.sendNotification(notification, delivery)).rejects.toThrow(
      'resend_retryable:429'
    );
    await expect(port.sendNotification(notification, delivery)).rejects.not.toThrow(
      'controlled-resend-key'
    );
  });

  it('invokes the runtime fetch function with the global receiver', async () => {
    const runtimeFetch = vi.fn(function (this: typeof globalThis) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(Response.json({ id: 'resend-message-controlled' }));
    });
    vi.stubGlobal('fetch', runtimeFetch);

    try {
      const port = new ResendNotificationPort({ apiKey: 'controlled-resend-key' });
      await expect(port.sendNotification(notification, delivery)).resolves.toEqual({
        messageId: 'resend-message-controlled'
      });
      expect(runtimeFetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
