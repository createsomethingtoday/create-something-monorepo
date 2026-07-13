import type {
  Booking,
  BookingNotificationJob,
  BookingStore,
  CommitActionResult,
  CommittedReceipt,
  LifecycleReceipt,
  ReminderJob,
  TransitionActionResult,
  TransitionReceipt
} from '../application/booking-service.js';

type BookingRow = {
  booking_json: string;
};

type ReminderRow = {
  reminder_id: string;
  attempts: number;
  payload_json: string;
};

export class DurableObjectBookingStore implements BookingStore {
  constructor(private readonly state: DurableObjectState) {
    const sql = state.storage.sql;
    sql.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        booking_id TEXT PRIMARY KEY,
        proposal_id TEXT NOT NULL,
        status TEXT NOT NULL,
        slot_start TEXT NOT NULL,
        slot_end TEXT NOT NULL,
        booking_json TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot
        ON bookings(slot_start, slot_end)
        WHERE status IN ('committed', 'rescheduled');
      CREATE TABLE IF NOT EXISTS idempotency (
        idempotency_key TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        result_status TEXT NOT NULL DEFAULT 'committed',
        receipt_id TEXT,
        request_fingerprint TEXT NOT NULL DEFAULT '',
        result_json TEXT NOT NULL DEFAULT '',
        FOREIGN KEY(booking_id) REFERENCES bookings(booking_id)
      );
      CREATE TABLE IF NOT EXISTS receipts (
        receipt_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        receipt_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reminders (
        reminder_id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        run_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        payload_json TEXT NOT NULL,
        FOREIGN KEY(booking_id) REFERENCES bookings(booking_id)
      );
      CREATE INDEX IF NOT EXISTS reminders_due
        ON reminders(status, run_at);
    `);
    const idempotencyColumns = new Set(
      sql.exec<{ name: string }>('PRAGMA table_info(idempotency)')
        .toArray().map((column) => column.name)
    );
    if (!idempotencyColumns.has('request_fingerprint')) {
      sql.exec("ALTER TABLE idempotency ADD COLUMN request_fingerprint TEXT NOT NULL DEFAULT ''");
    }
    if (!idempotencyColumns.has('result_json')) {
      sql.exec("ALTER TABLE idempotency ADD COLUMN result_json TEXT NOT NULL DEFAULT ''");
    }
  }

  async commitExactlyOnce(
    input: {
      proposalId: string;
      slot: { start: string; end: string };
      idempotencyKey: string;
      receipt: CommittedReceipt;
    },
    action: () => Promise<CommitActionResult>
  ): Promise<CommitActionResult & { replayed?: boolean }> {
    return this.state.blockConcurrencyWhile(async () => {
      const requestFingerprint = `commit:${input.proposalId}`;
      const replay = this.state.storage.sql.exec<BookingRow & {
        request_fingerprint: string;
        result_json: string;
      }>(
        `SELECT b.booking_json, i.request_fingerprint, i.result_json
           FROM idempotency i
           JOIN bookings b ON b.booking_id = i.booking_id
          WHERE i.idempotency_key = ?`,
        input.idempotencyKey
      ).toArray()[0];
      if (replay) {
        if (replay.request_fingerprint !== requestFingerprint) {
          return { status: 'rejected', reason: 'idempotency_key_conflict' };
        }
        return {
          status: 'committed',
          booking: JSON.parse(replay.result_json || replay.booking_json) as Booking,
          replayed: true
        };
      }

      const claimed = this.state.storage.sql.exec<{ booking_id: string }>(
        `SELECT booking_id
           FROM bookings
          WHERE slot_start = ? AND slot_end = ? AND status IN ('committed', 'rescheduled')
          LIMIT 1`,
        input.slot.start,
        input.slot.end
      ).toArray()[0];
      if (claimed) return { status: 'rejected', reason: 'slot_claimed' };

      const result = await action();
      if (result.status !== 'committed') return result;
      if (result.booking.proposalId !== input.proposalId) {
        return { status: 'rejected', reason: 'proposal_mismatch' };
      }

      this.state.storage.transactionSync(() => {
        this.state.storage.sql.exec(
          `INSERT INTO bookings(
             booking_id, proposal_id, status, slot_start, slot_end, booking_json
           ) VALUES (?, ?, 'committed', ?, ?, ?)`,
          result.booking.bookingId,
          result.booking.proposalId,
          result.booking.slot.start,
          result.booking.slot.end,
          JSON.stringify(result.booking)
        );
        this.state.storage.sql.exec(
          `INSERT INTO idempotency(
             idempotency_key, booking_id, result_status, receipt_id,
             request_fingerprint, result_json
           ) VALUES (?, ?, 'committed', ?, ?, ?)`,
          input.idempotencyKey,
          result.booking.bookingId,
          input.receipt.receiptId,
          requestFingerprint,
          JSON.stringify(result.booking)
        );
        this.state.storage.sql.exec(
          `INSERT INTO receipts(receipt_id, status, occurred_at, receipt_json)
           VALUES (?, ?, ?, ?)`,
          input.receipt.receiptId,
          input.receipt.status,
          input.receipt.occurredAt,
          JSON.stringify(input.receipt)
        );
        if (result.reminder) this.upsertReminder(result.reminder);
        for (const notification of result.notifications ?? []) {
          this.upsertNotification(notification);
        }
      });
      await this.scheduleNextAlarm();
      return { ...result, replayed: false };
    });
  }

  async transitionExactlyOnce(
    input: {
      bookingId: string;
      idempotencyKey: string;
      targetSlot?: { start: string; end: string };
      receipt: TransitionReceipt;
    },
    action: (booking: Booking) => Promise<TransitionActionResult>
  ): Promise<TransitionActionResult & { replayed?: boolean }> {
    return this.state.blockConcurrencyWhile(async () => {
      const requestFingerprint = transitionFingerprint(input);
      const replay = this.state.storage.sql.exec<BookingRow & {
        result_status: string;
        request_fingerprint: string;
        result_json: string;
      }>(
        `SELECT b.booking_json, i.result_status, i.request_fingerprint, i.result_json
           FROM idempotency i
           JOIN bookings b ON b.booking_id = i.booking_id
          WHERE i.idempotency_key = ?`,
        input.idempotencyKey
      ).toArray()[0];
      if (replay && replay.request_fingerprint !== requestFingerprint) {
        return { status: 'rejected', reason: 'idempotency_key_conflict' };
      }
      if (replay && (replay.result_status === 'rescheduled' || replay.result_status === 'cancelled')) {
        return {
          status: replay.result_status,
          booking: JSON.parse(replay.result_json || replay.booking_json) as Booking,
          replayed: true
        };
      }
      if (replay) return { status: 'rejected', reason: 'idempotency_key_conflict' };
      const booking = await this.getBooking(input.bookingId);
      if (!booking) return { status: 'rejected', reason: 'booking_not_found' };
      if (booking.status === 'cancelled') {
        return { status: 'rejected', reason: 'booking_cancelled' };
      }
      if (input.targetSlot) {
        const claimed = this.state.storage.sql.exec<{ booking_id: string }>(
          `SELECT booking_id FROM bookings
            WHERE slot_start = ? AND slot_end = ?
              AND status IN ('committed', 'rescheduled')
              AND booking_id <> ?
            LIMIT 1`,
          input.targetSlot.start,
          input.targetSlot.end,
          input.bookingId
        ).toArray()[0];
        if (claimed) return { status: 'rejected', reason: 'slot_claimed' };
      }
      const result = await action(booking);
      if (result.status !== 'rescheduled' && result.status !== 'cancelled') return result;

      this.state.storage.transactionSync(() => {
        this.state.storage.sql.exec(
          `UPDATE bookings
              SET status = ?, slot_start = ?, slot_end = ?, booking_json = ?
            WHERE booking_id = ?`,
          result.booking.status,
          result.booking.slot.start,
          result.booking.slot.end,
          JSON.stringify(result.booking),
          result.booking.bookingId
        );
        this.state.storage.sql.exec(
          `INSERT INTO idempotency(
             idempotency_key, booking_id, result_status, receipt_id,
             request_fingerprint, result_json
           ) VALUES (?, ?, ?, ?, ?, ?)`,
          input.idempotencyKey,
          result.booking.bookingId,
          result.status,
          input.receipt.receiptId,
          requestFingerprint,
          JSON.stringify(result.booking)
        );
        this.state.storage.sql.exec(
          `INSERT INTO receipts(receipt_id, status, occurred_at, receipt_json)
           VALUES (?, ?, ?, ?)`,
          input.receipt.receiptId,
          input.receipt.status,
          input.receipt.occurredAt,
          JSON.stringify(input.receipt)
        );
        if (result.reminder) this.upsertReminder(result.reminder);
        for (const notification of result.notifications ?? []) {
          this.upsertNotification(notification);
        }
      });
      await this.scheduleNextAlarm();
      return { ...result, replayed: false };
    });
  }

  async getBooking(bookingId: string): Promise<Booking | null> {
    const row = this.state.storage.sql.exec<BookingRow>(
      'SELECT booking_json FROM bookings WHERE booking_id = ?',
      bookingId
    ).toArray()[0];
    return row ? JSON.parse(row.booking_json) as Booking : null;
  }

  async recordReceipt(receipt: LifecycleReceipt): Promise<void> {
    this.state.storage.sql.exec(
      `INSERT INTO receipts(receipt_id, status, occurred_at, receipt_json)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(receipt_id) DO UPDATE SET
         status = excluded.status,
         occurred_at = excluded.occurred_at,
         receipt_json = excluded.receipt_json`,
      receipt.receiptId,
      receipt.status,
      receipt.occurredAt,
      JSON.stringify(receipt)
    );
  }

  async getReceipt(receiptId: string): Promise<LifecycleReceipt | null> {
    const row = this.state.storage.sql.exec<{ receipt_json: string }>(
      'SELECT receipt_json FROM receipts WHERE receipt_id = ?',
      receiptId
    ).toArray()[0];
    return row ? JSON.parse(row.receipt_json) as LifecycleReceipt : null;
  }

  async scheduleReminder(job: ReminderJob): Promise<void> {
    this.state.storage.sql.exec(
      `INSERT INTO reminders(reminder_id, booking_id, run_at, status, attempts, payload_json)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(reminder_id) DO UPDATE SET
         booking_id = excluded.booking_id,
         run_at = excluded.run_at,
         status = CASE WHEN reminders.status = 'sent' THEN reminders.status ELSE excluded.status END,
         payload_json = CASE WHEN reminders.status = 'sent' THEN reminders.payload_json ELSE excluded.payload_json END`,
      job.reminderId,
      job.bookingId,
      Date.parse(job.runAt),
      job.status,
      JSON.stringify(job)
    );
    await this.scheduleNextAlarm();
  }

  async processDueReminders(
    now: string,
    send: (job: ReminderJob) => Promise<{ messageId: string }>
  ): Promise<{ sent: number; retryable: number; failed: number }> {
    return this.state.blockConcurrencyWhile(async () => {
      const nowMilliseconds = Date.parse(now);
      const due = this.state.storage.sql.exec<ReminderRow>(
        `SELECT reminder_id, attempts, payload_json
           FROM reminders
          WHERE status IN ('pending', 'retryable') AND run_at <= ?
          ORDER BY run_at, reminder_id`,
        nowMilliseconds
      ).toArray();
      const result = { sent: 0, retryable: 0, failed: 0 };

      for (const row of due) {
        const job = JSON.parse(row.payload_json) as ReminderJob;
        try {
          const delivery = await send(job);
          const deliveredJob: ReminderJob = { ...job, status: 'sent' };
          this.state.storage.transactionSync(() => {
            this.state.storage.sql.exec(
              `UPDATE reminders SET status = 'sent', payload_json = ? WHERE reminder_id = ?`,
              JSON.stringify(deliveredJob),
              row.reminder_id
            );
            this.insertReminderReceipt({
              receiptId: job.receiptId,
              status: 'reminder_sent',
              policyVersion: job.policyVersion,
              occurredAt: now,
              bookingId: job.bookingId,
              reason: `message_id:${delivery.messageId}`,
              nextActions: ['get_booking']
            });
          });
          result.sent += 1;
        } catch (error) {
          const attempts = row.attempts + 1;
          const permanent = error instanceof Error && error.message.startsWith('resend_failed:');
          const exhausted = permanent || attempts >= 3;
          const status = exhausted ? 'failed' : 'retryable';
          const nextRunAt = nowMilliseconds + 60_000;
          const updatedJob: ReminderJob = {
            ...job,
            status,
            runAt: exhausted ? job.runAt : new Date(nextRunAt).toISOString()
          };
          this.state.storage.transactionSync(() => {
            this.state.storage.sql.exec(
              `UPDATE reminders
                  SET status = ?, attempts = ?, run_at = ?, payload_json = ?
                WHERE reminder_id = ?`,
              status,
              attempts,
              exhausted ? Date.parse(job.runAt) : nextRunAt,
              JSON.stringify(updatedJob),
              row.reminder_id
            );
            this.insertReminderReceipt({
              receiptId: job.receiptId,
              status: exhausted ? 'reminder_failed' : 'reminder_retryable',
              policyVersion: job.policyVersion,
              occurredAt: now,
              bookingId: job.bookingId,
              reason: error instanceof Error ? error.message : 'reminder_delivery_failed',
              nextActions: exhausted ? ['contact_operator'] : ['retry_reminder']
            });
          });
          if (exhausted) result.failed += 1;
          else result.retryable += 1;
        }
      }

      await this.scheduleNextAlarm();
      return result;
    });
  }

  async processDueNotifications(
    now: string,
    send: (job: BookingNotificationJob) => Promise<{ messageId: string }>
  ): Promise<{ sent: number; retryable: number; failed: number }> {
    return this.state.blockConcurrencyWhile(async () => {
      const nowMilliseconds = Date.parse(now);
      const due = this.state.storage.sql.exec<ReminderRow>(
        `SELECT reminder_id, attempts, payload_json
           FROM reminders
          WHERE status IN ('pending', 'retryable') AND run_at <= ?
          ORDER BY run_at, reminder_id`,
        nowMilliseconds
      ).toArray();
      const result = { sent: 0, retryable: 0, failed: 0 };

      for (const row of due) {
        let parsed: Record<string, unknown> | undefined;
        try {
          parsed = JSON.parse(row.payload_json) as Record<string, unknown>;
        } catch {
          // A malformed durable row cannot be retried into validity. Quarantine it so
          // it does not keep the Durable Object alarm pinned in a hot loop.
        }
        const job = parsed ? normalizeNotificationJob(parsed) : null;
        if (!job) {
          this.state.storage.sql.exec(
            `UPDATE reminders SET status = 'failed', attempts = 3 WHERE reminder_id = ?`,
            row.reminder_id
          );
          result.failed += 1;
          continue;
        }
        try {
          const delivery = await send(job);
          const deliveredJob: BookingNotificationJob = { ...job, status: 'sent' };
          this.state.storage.transactionSync(() => {
            this.state.storage.sql.exec(
              `UPDATE reminders SET status = 'sent', payload_json = ? WHERE reminder_id = ?`,
              JSON.stringify(deliveredJob),
              row.reminder_id
            );
            this.insertReminderReceipt({
              receiptId: job.receiptId,
              status: 'notification_sent',
              policyVersion: job.policyVersion,
              occurredAt: now,
              bookingId: job.bookingId,
              reason: `message_id:${delivery.messageId}`,
              nextActions: ['get_booking']
            });
          });
          result.sent += 1;
        } catch (error) {
          const attempts = row.attempts + 1;
          const permanent = error instanceof Error && error.message.startsWith('resend_failed:');
          const exhausted = permanent || attempts >= 3;
          const status = exhausted ? 'failed' : 'retryable';
          const nextRunAt = nowMilliseconds + 60_000;
          const updatedJob: BookingNotificationJob = {
            ...job,
            status,
            runAt: exhausted ? job.runAt : new Date(nextRunAt).toISOString()
          };
          this.state.storage.transactionSync(() => {
            this.state.storage.sql.exec(
              `UPDATE reminders
                  SET status = ?, attempts = ?, run_at = ?, payload_json = ?
                WHERE reminder_id = ?`,
              status,
              attempts,
              exhausted ? Date.parse(job.runAt) : nextRunAt,
              JSON.stringify(updatedJob),
              row.reminder_id
            );
            this.insertReminderReceipt({
              receiptId: job.receiptId,
              status: exhausted ? 'notification_failed' : 'notification_retryable',
              policyVersion: job.policyVersion,
              occurredAt: now,
              bookingId: job.bookingId,
              reason: error instanceof Error ? error.message : 'notification_delivery_failed',
              nextActions: exhausted ? ['contact_operator'] : ['retry_notification']
            });
          });
          if (exhausted) result.failed += 1;
          else result.retryable += 1;
        }
      }

      await this.scheduleNextAlarm();
      return result;
    });
  }

  private insertReminderReceipt(receipt: LifecycleReceipt): void {
    this.state.storage.sql.exec(
      `INSERT INTO receipts(receipt_id, status, occurred_at, receipt_json)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(receipt_id) DO UPDATE SET
         status = excluded.status,
         occurred_at = excluded.occurred_at,
         receipt_json = excluded.receipt_json`,
      receipt.receiptId,
      receipt.status,
      receipt.occurredAt,
      JSON.stringify(receipt)
    );
  }

  private upsertReminder(job: ReminderJob): void {
    this.state.storage.sql.exec(
      `INSERT INTO reminders(reminder_id, booking_id, run_at, status, attempts, payload_json)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(reminder_id) DO UPDATE SET
         booking_id = excluded.booking_id,
         run_at = excluded.run_at,
         status = excluded.status,
         attempts = CASE WHEN excluded.status = 'pending' THEN 0 ELSE reminders.attempts END,
         payload_json = excluded.payload_json`,
      job.reminderId,
      job.bookingId,
      Date.parse(job.runAt),
      job.status,
      JSON.stringify(job)
    );
  }

  private upsertNotification(job: BookingNotificationJob): void {
    this.state.storage.sql.exec(
      `INSERT INTO reminders(reminder_id, booking_id, run_at, status, attempts, payload_json)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(reminder_id) DO UPDATE SET
         booking_id = excluded.booking_id,
         run_at = excluded.run_at,
         status = CASE WHEN reminders.status = 'sent' THEN reminders.status ELSE excluded.status END,
         attempts = CASE WHEN excluded.status = 'pending' THEN 0 ELSE reminders.attempts END,
         payload_json = CASE WHEN reminders.status = 'sent' THEN reminders.payload_json ELSE excluded.payload_json END`,
      job.notificationId,
      job.bookingId,
      Date.parse(job.runAt),
      job.status,
      JSON.stringify(job)
    );
  }

  private async scheduleNextAlarm(): Promise<void> {
    const next = this.state.storage.sql.exec<{ run_at: number }>(
      `SELECT run_at FROM reminders
        WHERE status IN ('pending', 'retryable')
        ORDER BY run_at LIMIT 1`
    ).toArray()[0];
    if (next) await this.state.storage.setAlarm(next.run_at);
    else await this.state.storage.deleteAlarm();
  }
}

function normalizeNotificationJob(value: Record<string, unknown>): BookingNotificationJob | null {
  if (
    typeof value.receiptId !== 'string' ||
    typeof value.bookingId !== 'string' ||
    typeof value.policyVersion !== 'string' ||
    typeof value.runAt !== 'string' ||
    !['pending', 'retryable', 'sent', 'failed', 'cancelled'].includes(String(value.status))
  ) return null;
  if (
    typeof value.notificationId === 'string' &&
    typeof value.slotStart === 'string' &&
    ['confirmation', 'reminder', 'rescheduled'].includes(String(value.kind))
  ) return value as BookingNotificationJob;
  if (typeof value.reminderId === 'string') {
    const legacySlot = value.slot as { start?: unknown } | undefined;
    if (typeof legacySlot?.start !== 'string') return null;
    return {
      notificationId: value.reminderId,
      receiptId: value.receiptId,
      bookingId: value.bookingId,
      slotStart: legacySlot.start,
      kind: 'reminder',
      policyVersion: value.policyVersion,
      runAt: value.runAt,
      status: value.status as BookingNotificationJob['status']
    };
  }
  return null;
}

function transitionFingerprint(input: {
  bookingId: string;
  targetSlot?: { start: string; end: string };
  receipt: TransitionReceipt;
}): string {
  const target = input.targetSlot
    ? `${input.targetSlot.start}/${input.targetSlot.end}`
    : 'none';
  return `${input.receipt.status}:${input.bookingId}:${target}`;
}
