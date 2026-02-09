/**
 * Schedule Notifier Worker
 *
 * Cron-triggered reminder scanner + Queue-based email delivery via Resend.
 * Reads from the same D1 database as the Schedule MCP server.
 *
 * Three-Tier Framework:
 *   Orchestration (cross-cutting) — cron scans, queue processes
 *   Automation (Tools tier) — Resend email delivery
 *   Insight (cross-cutting) — notification_log audit trail
 */

interface Env {
  DB: D1Database;
  NOTIFICATION_QUEUE: Queue;
  RESEND_API_KEY: string;
}

interface NotificationMessage {
  notification_id: string;
  phone: string;  // kept for log compatibility — delivery goes to email
  email: string;
  message: string;
  member_id: string;
  trigger_type: string;
}

// =============================================================================
// Fetch Handler (Health Check)
// =============================================================================

async function handleFetch(request: Request, env: Env): Promise<Response> {
  return new Response(JSON.stringify({
    name: 'schedule-notifier',
    version: '1.1.0',
    description: 'Email notification worker for Schedule MCP (via Resend)',
    triggers: {
      cron: '*/5 * * * * (reminder scanner)',
      queue: 'schedule-notifications (email delivery via Resend)',
    },
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// Cron Handler — Reminder Scanner
// =============================================================================

async function handleScheduled(env: Env): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);

  // 1. Process pending notifications (from tool hooks — changes, conflicts, manual)
  await processPendingNotifications(env, nowSeconds);

  // 2. Scan for upcoming event reminders
  await scanForReminders(env, nowSeconds);
}

/**
 * Pick up notifications written by the MCP tools (status = 'pending')
 * and enqueue them for SMS delivery.
 */
async function processPendingNotifications(env: Env, nowSeconds: number): Promise<void> {
  const pending = await env.DB
    .prepare(
      `SELECT nl.*, m.email as member_email
       FROM notification_log nl
       JOIN members m ON m.id = nl.member_id
       WHERE nl.status = 'pending'
         AND (nl.scheduled_for IS NULL OR nl.scheduled_for <= ?)
       ORDER BY nl.created_at ASC
       LIMIT 50`,
    )
    .bind(nowSeconds)
    .all<{
      id: string;
      member_id: string;
      phone: string;
      member_email: string | null;
      message: string;
      trigger_type: string;
    }>();

  if (pending.results.length === 0) return;

  const messages: MessageSendRequest<NotificationMessage>[] = [];

  for (const row of pending.results) {
    if (!row.member_email) {
      console.warn(`[notifier] Skipping ${row.id}: member ${row.member_id} has no email`);
      continue;
    }

    messages.push({
      body: {
        notification_id: row.id,
        phone: row.phone,
        email: row.member_email,
        message: row.message,
        member_id: row.member_id,
        trigger_type: row.trigger_type,
      },
    });

    // Mark as queued
    await env.DB
      .prepare(`UPDATE notification_log SET status = 'queued' WHERE id = ?`)
      .bind(row.id)
      .run();
  }

  if (messages.length > 0) {
    await env.NOTIFICATION_QUEUE.sendBatch(messages);
    console.log(`[notifier] Enqueued ${messages.length} pending notifications`);
  }
}

/**
 * Scan for events that need reminder notifications.
 * For each member with reminders enabled, check their reminder windows.
 */
async function scanForReminders(env: Env, nowSeconds: number): Promise<void> {
  // Get all members with reminders enabled and email set
  const members = await env.DB
    .prepare(
      `SELECT m.id, m.name, m.email, m.phone, np.reminder_minutes_1, np.reminder_minutes_2, np.reminder_minutes_3
       FROM members m
       JOIN notification_preferences np ON np.member_id = m.id
       WHERE np.reminders_enabled = 1 AND np.sms_enabled = 1 AND m.email IS NOT NULL`,
    )
    .all<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      reminder_minutes_1: number;
      reminder_minutes_2: number;
      reminder_minutes_3: number;
    }>();

  if (members.results.length === 0) return;

  // For each member, check each reminder window
  for (const member of members.results) {
    const windows = [
      member.reminder_minutes_1,
      member.reminder_minutes_2,
      member.reminder_minutes_3,
    ].filter((m) => m > 0);

    for (const minutesBefore of windows) {
      const windowStart = nowSeconds + (minutesBefore * 60) - 150; // 2.5 min tolerance
      const windowEnd = nowSeconds + (minutesBefore * 60) + 150;

      // Find events starting within this reminder window
      // that this member is a participant of (or owns the calendar)
      const events = await env.DB
        .prepare(
          `SELECT DISTINCT e.id, e.title, e.start_time, e.calendar_id, c.name as calendar_name
           FROM events e
           JOIN calendars c ON c.id = e.calendar_id
           LEFT JOIN event_participants ep ON ep.event_id = e.id
           WHERE e.start_time >= ? AND e.start_time <= ?
             AND e.status != 'cancelled'
             AND (c.owner_id = ? OR ep.member_id = ?)`,
        )
        .bind(windowStart, windowEnd, member.id, member.id)
        .all<{
          id: string;
          title: string;
          start_time: number;
          calendar_id: string;
          calendar_name: string;
        }>();

      for (const event of events.results) {
        // Dedup key: member + event + window
        const dedupKey = `reminder:${member.id}:${event.id}:${minutesBefore}`;

        // Check if already sent
        const existing = await env.DB
          .prepare(
            `SELECT id FROM notification_log WHERE dedup_key = ? AND status != 'failed' LIMIT 1`,
          )
          .bind(dedupKey)
          .first<{ id: string }>();

        if (existing) continue;

        // Format the reminder message
        const timeStr = formatTime(event.start_time);
        const leadStr = formatLeadTime(minutesBefore);
        const message = `Reminder: "${event.title}" starts ${leadStr} (${timeStr})`;

        // Create notification log entry
        const notifId = crypto.randomUUID();
        await env.DB
          .prepare(
            `INSERT INTO notification_log
               (id, member_id, event_id, trigger_type, phone, message, status, dedup_key, created_at)
             VALUES (?, ?, ?, 'reminder', ?, ?, 'queued', ?, ?)`,
          )
          .bind(notifId, member.id, event.id, member.phone ?? '', message, dedupKey, nowSeconds)
          .run();

        // Enqueue for email delivery
        await env.NOTIFICATION_QUEUE.send({
          notification_id: notifId,
          phone: member.phone ?? '',
          email: member.email,
          message,
          member_id: member.id,
          trigger_type: 'reminder',
        } satisfies NotificationMessage);
      }
    }
  }
}

// =============================================================================
// Queue Handler — SMS Delivery via Twilio
// =============================================================================

async function handleQueue(
  batch: MessageBatch<NotificationMessage>,
  env: Env,
): Promise<void> {
  for (const msg of batch.messages) {
    const { notification_id, email, message } = msg.body;

    try {
      await sendNotificationEmail(env, email, message);

      // Mark as sent
      await env.DB
        .prepare(
          `UPDATE notification_log SET status = 'sent', sent_at = ? WHERE id = ?`,
        )
        .bind(Math.floor(Date.now() / 1000), notification_id)
        .run();

      msg.ack();
      console.log(`[notifier] Email sent to ${email} (${notification_id})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if transient
      if (isTransientError(error)) {
        console.error(`[notifier] Transient error for ${notification_id}: ${errorMessage}`);
        msg.retry();
      } else {
        // Permanent failure — ack and log
        await env.DB
          .prepare(
            `UPDATE notification_log SET status = 'failed', error_message = ? WHERE id = ?`,
          )
          .bind(errorMessage, notification_id)
          .run();

        msg.ack();
        console.error(`[notifier] Permanent failure for ${notification_id}: ${errorMessage}`);
      }
    }
  }
}

/**
 * Send notification email via Resend API.
 * Uses the same pattern as identity-worker/src/services/email.ts.
 */
async function sendNotificationEmail(env: Env, to: string, body: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  // Extract a subject from the body (first line or first 60 chars)
  const subject = body.length > 60 ? body.slice(0, 57) + '...' : body;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff; }
    .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
    .logo { font-size: 12px; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.4); margin-bottom: 24px; }
    .message { font-size: 18px; line-height: 1.5; color: #ffffff; margin: 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 13px; color: rgba(255, 255, 255, 0.3); }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">SCHEDULE</div>
    <p class="message">${body}</p>
    <div class="footer">Johnson Family Calendar</div>
  </div>
</body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Schedule <noreply@createsomething.io>',
      to,
      subject: `📅 ${subject}`,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorBody}`);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('network') || msg.includes('429') || msg.includes('503');
  }
  return false;
}

function formatTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m} ${ampm} UTC`;
}

function formatLeadTime(minutes: number): string {
  if (minutes < 60) return `in ${minutes} minutes`;
  if (minutes === 60) return 'in 1 hour';
  if (minutes < 1440) return `in ${Math.round(minutes / 60)} hours`;
  if (minutes === 1440) return 'tomorrow';
  return `in ${Math.round(minutes / 1440)} days`;
}

// =============================================================================
// Worker Entry Point
// =============================================================================

export default {
  fetch: handleFetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },

  async queue(batch: MessageBatch<NotificationMessage>, env: Env): Promise<void> {
    await handleQueue(batch, env);
  },
};
