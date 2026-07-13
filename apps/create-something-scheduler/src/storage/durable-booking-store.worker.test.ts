import { env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type {
  Booking,
  LifecycleReceipt
} from '../application/booking-service.js';
import { DurableObjectBookingStore } from './durable-booking-store.js';

const isolatedObjectName = (name: string): string => `${name}-${crypto.randomUUID()}`;

describe('DurableObjectBookingStore', () => {
  it('queues immediate confirmation and scheduled reminder intent without an action credential', async () => {
    const stub = env.SCHEDULER.get(env.SCHEDULER.idFromName(isolatedObjectName('notification-intent-test')));
    const booking: Booking = {
      bookingId: 'booking_notification_intent',
      proposalId: 'proposal_notification_intent',
      status: 'committed',
      slot: { start: '2030-07-14T16:00:00Z', end: '2030-07-14T16:30:00Z' },
      scheduler: { name: 'Controlled Test', email: 'controlled@example.com' },
      provider: {
        eventId: 'event_notification_intent',
        meetUrl: 'https://meet.google.com/notification-intent'
      }
    };
    const base = {
      bookingId: booking.bookingId,
      slotStart: booking.slot.start,
      policyVersion: 'createsomething-together.v1',
      status: 'pending' as const
    };
    const notifications = [
      {
        ...base,
        notificationId: 'notification_confirmation_controlled',
        receiptId: 'receipt_confirmation_controlled',
        kind: 'confirmation' as const,
        runAt: '2030-07-13T15:00:00Z'
      },
      {
        ...base,
        notificationId: 'notification_reminder_controlled',
        receiptId: 'receipt_reminder_controlled',
        kind: 'reminder' as const,
        runAt: '2030-07-14T15:00:00Z'
      }
    ];

    const readback = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      await store.commitExactlyOnce({
        proposalId: booking.proposalId,
        slot: booking.slot,
        idempotencyKey: 'notification-intent-key',
        receipt: {
          receiptId: 'receipt_notification_intent',
          status: 'committed',
          policyVersion: base.policyVersion,
          occurredAt: '2030-07-13T15:00:00Z',
          nextActions: ['get_booking'],
          bookingId: booking.bookingId
        }
      }, async () => ({ status: 'committed', booking, notifications }));
      return {
        alarm: await state.storage.getAlarm(),
        rows: state.storage.sql.exec<{ payload_json: string }>(
          'SELECT payload_json FROM reminders ORDER BY run_at, reminder_id'
        ).toArray().map((row) => row.payload_json)
      };
    });

    expect(readback.alarm).toBe(Date.parse('2030-07-13T15:00:00Z'));
    expect(readback.rows).toHaveLength(2);
    expect(readback.rows.join('\n')).not.toMatch(/actionToken|access=|controlled\.token/i);
    expect(readback.rows.join('\n')).not.toContain(booking.scheduler.email);
    expect(readback.rows.join('\n')).not.toContain(booking.provider.meetUrl);
    expect(readback.rows.map((row) => JSON.parse(row))).toEqual(notifications);

    const delivered: string[] = [];
    const firstDelivery = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      return store.processDueNotifications('2030-07-13T15:00:00Z', async (job) => {
        delivered.push(job.kind);
        return { messageId: `message_${job.kind}` };
      });
    });
    expect(firstDelivery).toEqual({ sent: 1, retryable: 0, failed: 0 });
    expect(delivered).toEqual(['confirmation']);

    const reminderDelivery = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      return store.processDueNotifications('2030-07-14T15:00:00Z', async (job) => {
        delivered.push(job.kind);
        return { messageId: `message_${job.kind}` };
      });
    });
    expect(reminderDelivery).toEqual({ sent: 1, retryable: 0, failed: 0 });
    expect(delivered).toEqual(['confirmation', 'reminder']);
  });

  it('persists a committed booking and replays its idempotency key after a new store instance', async () => {
    const objectId = env.SCHEDULER.idFromName(isolatedObjectName('durable-idempotency-test'));
    const stub = env.SCHEDULER.get(objectId);
    const booking: Booking = {
      bookingId: 'booking_durable',
      proposalId: 'proposal_durable',
      status: 'committed',
      slot: {
        start: '2026-07-14T16:00:00Z',
        end: '2026-07-14T16:30:00Z'
      },
      scheduler: {
        name: 'Controlled Test',
        email: 'controlled@example.com'
      },
      provider: {
        eventId: 'google-event-durable',
        meetUrl: 'https://meet.google.com/durable-test'
      }
    };
    const input = {
      proposalId: booking.proposalId,
      slot: booking.slot,
      idempotencyKey: 'durable-idempotency-key',
      receipt: {
        receiptId: 'receipt_durable',
        status: 'committed',
        policyVersion: 'createsomething-together.v1',
        occurredAt: '2026-07-13T15:00:00Z',
        nextActions: ['get_booking'],
        bookingId: booking.bookingId
      } satisfies LifecycleReceipt
    };
    const reminder = {
      reminderId: 'reminder_durable',
      receiptId: 'receipt_reminder_durable',
      bookingId: booking.bookingId,
      policyVersion: 'createsomething-together.v1',
      runAt: '2026-07-14T15:00:00Z',
      status: 'pending' as const,
      scheduler: booking.scheduler,
      slot: booking.slot,
      meetUrl: booking.provider.meetUrl
    };

    const first = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      const result = await store.commitExactlyOnce(input, async () => ({
        status: 'committed', booking, reminder
      }));
      return { result, alarm: await state.storage.getAlarm() };
    });
    expect(first).toEqual({
      result: { status: 'committed', booking, reminder, replayed: false },
      alarm: Date.parse(reminder.runAt)
    });

    const replay = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      return store.commitExactlyOnce(input, async () => {
        throw new Error('The provider action must not rerun for an idempotent replay.');
      });
    });
    expect(replay).toEqual({ status: 'committed', booking, replayed: true });

    const readback = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      return {
        booking: await store.getBooking(booking.bookingId),
        receipt: await store.getReceipt(input.receipt.receiptId)
      };
    });
    expect(readback).toEqual({ booking, receipt: input.receipt });
  });

  it('binds idempotency keys to exact operations and treats rescheduled slots as claimed', async () => {
    const stub = env.SCHEDULER.get(env.SCHEDULER.idFromName(isolatedObjectName('durable-operation-binding-test')));
    const original: Booking = {
      bookingId: 'booking_binding_a',
      proposalId: 'proposal_binding_a',
      status: 'committed',
      slot: { start: '2030-07-14T16:00:00Z', end: '2030-07-14T16:30:00Z' },
      scheduler: { name: 'Binding A', email: 'binding-a@example.com' },
      provider: { eventId: 'event-binding-a', meetUrl: 'https://meet.google.com/binding-a' }
    };
    const commitInput = {
      proposalId: original.proposalId,
      slot: original.slot,
      idempotencyKey: 'binding-commit-key',
      receipt: {
        receiptId: 'receipt_binding_commit',
        status: 'committed' as const,
        policyVersion: 'createsomething-together.v1',
        occurredAt: '2026-07-13T15:00:00Z',
        nextActions: ['get_booking'],
        bookingId: original.bookingId
      }
    };
    const moved: Booking = {
      ...original,
      status: 'rescheduled',
      slot: { start: '2026-07-16T18:00:00Z', end: '2026-07-16T18:30:00Z' }
    };
    const rescheduleInput = {
      bookingId: original.bookingId,
      idempotencyKey: 'binding-reschedule-key',
      targetSlot: moved.slot,
      receipt: {
        receiptId: 'receipt_binding_reschedule',
        status: 'rescheduled' as const,
        policyVersion: 'createsomething-together.v1',
        occurredAt: '2026-07-13T16:00:00Z',
        nextActions: ['get_booking'],
        bookingId: original.bookingId
      }
    };

    await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      await store.commitExactlyOnce(commitInput, async () => ({ status: 'committed', booking: original }));
      await store.transitionExactlyOnce(
        rescheduleInput,
        async () => ({ status: 'rescheduled', booking: moved })
      );
    });

    const audit = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      let conflictingProviderCalls = 0;
      const commitReplay = await store.commitExactlyOnce(commitInput, async () => {
        throw new Error('Commit replay must use its stored result snapshot.');
      });
      const keyConflict = await store.commitExactlyOnce(
        { ...commitInput, proposalId: 'proposal_binding_other' },
        async () => {
          conflictingProviderCalls += 1;
          return { status: 'committed', booking: original };
        }
      );
      const secondBooking: Booking = {
        ...original,
        bookingId: 'booking_binding_b',
        proposalId: 'proposal_binding_b',
        slot: moved.slot
      };
      const slotConflict = await store.commitExactlyOnce({
        ...commitInput,
        proposalId: secondBooking.proposalId,
        slot: secondBooking.slot,
        idempotencyKey: 'binding-second-commit-key',
        receipt: {
          ...commitInput.receipt,
          receiptId: 'receipt_binding_second',
          bookingId: secondBooking.bookingId
        }
      }, async () => {
        conflictingProviderCalls += 1;
        return { status: 'committed', booking: secondBooking };
      });
      const crossOperationConflict = await store.transitionExactlyOnce({
        ...rescheduleInput,
        idempotencyKey: commitInput.idempotencyKey
      }, async () => {
        throw new Error('A commit key must not be reusable for a transition.');
      });
      return {
        commitReplay,
        keyConflict,
        slotConflict,
        crossOperationConflict,
        conflictingProviderCalls
      };
    });

    expect(audit).toEqual({
      commitReplay: { status: 'committed', booking: original, replayed: true },
      keyConflict: { status: 'rejected', reason: 'idempotency_key_conflict' },
      slotConflict: { status: 'rejected', reason: 'slot_claimed' },
      crossOperationConflict: { status: 'rejected', reason: 'idempotency_key_conflict' },
      conflictingProviderCalls: 0
    });

    const transitionSnapshot = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      const cancelled: Booking = { ...moved, status: 'cancelled' };
      await store.transitionExactlyOnce({
        bookingId: original.bookingId,
        idempotencyKey: 'binding-cancel-key',
        receipt: {
          receiptId: 'receipt_binding_cancel',
          status: 'cancelled',
          policyVersion: 'createsomething-together.v1',
          occurredAt: '2026-07-13T17:00:00Z',
          nextActions: ['get_booking'],
          bookingId: original.bookingId
        }
      }, async () => ({ status: 'cancelled', booking: cancelled }));
      return store.transitionExactlyOnce(rescheduleInput, async () => {
        throw new Error('Transition replay must use its stored result snapshot.');
      });
    });
    expect(transitionSnapshot).toEqual({
      status: 'rescheduled',
      booking: moved,
      replayed: true
    });
  });

  it('runs a due reminder once and records its delivery receipt', async () => {
    const stub = env.SCHEDULER.get(env.SCHEDULER.idFromName(isolatedObjectName('reminder-queue-test')));
    const reminder = {
      reminderId: 'reminder_controlled',
      receiptId: 'receipt_reminder_controlled',
      bookingId: 'booking_controlled',
      policyVersion: 'createsomething-together.v1',
      runAt: '2026-07-14T15:00:00Z',
      status: 'pending' as const,
      scheduler: {
        name: 'Controlled Test',
        email: 'controlled@example.com'
      },
      slot: {
        start: '2026-07-14T16:00:00Z',
        end: '2026-07-14T16:30:00Z'
      },
      meetUrl: 'https://meet.google.com/reminder-test'
    };
    const scheduledAlarm = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      const booking: Booking = {
        bookingId: reminder.bookingId,
        proposalId: 'proposal_controlled',
        status: 'committed',
        slot: reminder.slot,
        scheduler: reminder.scheduler,
        provider: {
          eventId: 'google-event-reminder',
          meetUrl: reminder.meetUrl
        }
      };
      await store.commitExactlyOnce({
        proposalId: booking.proposalId,
        slot: booking.slot,
        idempotencyKey: 'reminder-booking-key',
        receipt: {
          receiptId: 'receipt_reminder_booking',
          status: 'committed',
          policyVersion: reminder.policyVersion,
          occurredAt: '2026-07-13T15:00:00Z',
          nextActions: ['get_booking'],
          bookingId: booking.bookingId
        }
      }, async () => ({ status: 'committed', booking }));
      await store.scheduleReminder(reminder);
      return state.storage.getAlarm();
    });
    expect(scheduledAlarm).toBe(Date.parse(reminder.runAt));

    let sends = 0;
    const first = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      return store.processDueReminders('2026-07-14T15:00:00Z', async (job) => {
        sends += 1;
        expect(job.reminderId).toBe(reminder.reminderId);
        return { messageId: 'resend-message-controlled' };
      });
    });
    const second = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      return store.processDueReminders('2026-07-14T15:01:00Z', async () => {
        sends += 1;
        return { messageId: 'unexpected-message' };
      });
    });
    const receipt = await runInDurableObject(stub, async (_instance, state) => {
      return new DurableObjectBookingStore(state).getReceipt(reminder.receiptId);
    });

    expect(first).toEqual({ sent: 1, retryable: 0, failed: 0 });
    expect(second).toEqual({ sent: 0, retryable: 0, failed: 0 });
    expect(sends).toBe(1);
    expect(receipt).toMatchObject({
      status: 'reminder_sent',
      bookingId: reminder.bookingId
    });
  });

  it('retries failed reminder delivery twice, then records terminal failure without another alarm', async () => {
    const stub = env.SCHEDULER.get(env.SCHEDULER.idFromName(isolatedObjectName('reminder-retry-test')));
    const booking: Booking = {
      bookingId: 'booking_retry',
      proposalId: 'proposal_retry',
      status: 'committed',
      slot: { start: '2026-07-14T16:00:00Z', end: '2026-07-14T16:30:00Z' },
      scheduler: { name: 'Controlled Retry', email: 'retry@example.com' },
      provider: {
        eventId: 'google-event-retry',
        meetUrl: 'https://meet.google.com/retry-test'
      }
    };
    const reminder = {
      reminderId: 'reminder_retry',
      receiptId: 'receipt_reminder_retry',
      bookingId: booking.bookingId,
      policyVersion: 'createsomething-together.v1',
      runAt: '2026-07-14T15:00:00Z',
      status: 'pending' as const,
      scheduler: booking.scheduler,
      slot: booking.slot,
      meetUrl: booking.provider.meetUrl
    };
    await runInDurableObject(stub, async (_instance, state) => {
      await new DurableObjectBookingStore(state).commitExactlyOnce({
        proposalId: booking.proposalId,
        slot: booking.slot,
        idempotencyKey: 'retry-booking-key',
        receipt: {
          receiptId: 'receipt_retry_booking',
          status: 'committed',
          policyVersion: reminder.policyVersion,
          occurredAt: '2026-07-13T15:00:00Z',
          nextActions: ['get_booking'],
          bookingId: booking.bookingId
        }
      }, async () => ({ status: 'committed', booking, reminder }));
    });
    const fail = async () => { throw new Error('resend_retryable:503'); };

    const first = await runInDurableObject(stub, async (_instance, state) => ({
      result: await new DurableObjectBookingStore(state).processDueReminders(
        '2026-07-14T15:00:00Z', fail
      ),
      alarm: await state.storage.getAlarm()
    }));
    expect(first).toEqual({
      result: { sent: 0, retryable: 1, failed: 0 },
      alarm: Date.parse('2026-07-14T15:01:00Z')
    });

    await runInDurableObject(stub, async (_instance, state) => {
      return new DurableObjectBookingStore(state).processDueReminders(
        '2026-07-14T15:01:00Z', fail
      );
    });
    const terminal = await runInDurableObject(stub, async (_instance, state) => ({
      result: await new DurableObjectBookingStore(state).processDueReminders(
        '2026-07-14T15:02:00Z', fail
      ),
      alarm: await state.storage.getAlarm(),
      receipt: await new DurableObjectBookingStore(state).getReceipt(reminder.receiptId)
    }));
    expect(terminal).toMatchObject({
      result: { sent: 0, retryable: 0, failed: 1 },
      alarm: null,
      receipt: { status: 'reminder_failed', bookingId: booking.bookingId }
    });

    const permanentReminder = {
      ...reminder,
      reminderId: 'reminder_permanent_failure',
      receiptId: 'receipt_reminder_permanent_failure',
      runAt: '2026-07-14T15:03:00Z'
    };
    const permanent = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableObjectBookingStore(state);
      await store.scheduleReminder(permanentReminder);
      const result = await store.processDueReminders(
        permanentReminder.runAt,
        async () => { throw new Error('resend_failed:400'); }
      );
      return {
        result,
        alarm: await state.storage.getAlarm(),
        receipt: await store.getReceipt(permanentReminder.receiptId)
      };
    });
    expect(permanent).toMatchObject({
      result: { sent: 0, retryable: 0, failed: 1 },
      alarm: null,
      receipt: { status: 'reminder_failed' }
    });
  });

  it('retries a booking notification without storing provider details in its receipt', async () => {
    const stub = env.SCHEDULER.get(env.SCHEDULER.idFromName(isolatedObjectName('notification-retry-test')));
    const booking: Booking = {
      bookingId: 'booking_notification_retry',
      proposalId: 'proposal_notification_retry',
      status: 'committed',
      slot: { start: '2026-07-14T16:00:00Z', end: '2026-07-14T16:30:00Z' },
      scheduler: { name: 'Controlled Retry', email: 'retry@example.com' },
      provider: {
        eventId: 'event_notification_retry',
        meetUrl: 'https://meet.google.com/notification-retry'
      }
    };
    const notification = {
      notificationId: 'notification_confirmation_retry',
      receiptId: 'receipt_notification_confirmation_retry',
      bookingId: booking.bookingId,
      slotStart: booking.slot.start,
      kind: 'confirmation' as const,
      policyVersion: 'createsomething-together.v1',
      runAt: '2030-07-13T15:00:00Z',
      status: 'pending' as const
    };
    await runInDurableObject(stub, async (_instance, state) => {
      await new DurableObjectBookingStore(state).commitExactlyOnce({
        proposalId: booking.proposalId,
        slot: booking.slot,
        idempotencyKey: 'notification-retry-key',
        receipt: {
          receiptId: 'receipt_notification_retry_booking',
          status: 'committed',
          policyVersion: notification.policyVersion,
          occurredAt: notification.runAt,
          nextActions: ['get_booking'],
          bookingId: booking.bookingId
        }
      }, async () => ({ status: 'committed', booking, notifications: [notification] }));
    });
    const fail = async () => { throw new Error('resend_retryable:503'); };
    for (const now of [
      '2030-07-13T15:00:00Z',
      '2030-07-13T15:01:00Z',
      '2030-07-13T15:02:00Z'
    ]) {
      await runInDurableObject(stub, async (_instance, state) =>
        new DurableObjectBookingStore(state).processDueNotifications(now, fail)
      );
    }
    const terminal = await runInDurableObject(stub, async (_instance, state) => ({
      alarm: await state.storage.getAlarm(),
      receipt: await new DurableObjectBookingStore(state).getReceipt(notification.receiptId)
    }));
    expect(terminal).toMatchObject({
      alarm: null,
      receipt: {
        status: 'notification_failed',
        bookingId: booking.bookingId,
        reason: 'resend_retryable:503'
      }
    });
    expect(JSON.stringify(terminal.receipt)).not.toMatch(/retry@example|notification-retry|access=/i);
  });
});
