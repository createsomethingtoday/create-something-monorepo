/**
 * Notification Queue Worker
 *
 * Cron + Queue pattern for:
 * - Schedule reminders (24h and 2h before reservation)
 * - Send waitlist slot notifications
 * - Handle notification retries
 *
 * The infrastructure disappears; notifications arrive.
 */

import type { Reservation, WaitlistEntry, Member } from '$lib/types';

// ============================================================================
// Types
// ============================================================================

interface NotificationMessage {
	type: 'reminder' | 'waitlist_offer' | 'waitlist_auto_booked' | 'cancellation' | 'confirmation';
	reservationId?: string;
	waitlistId?: string;
	memberId: string;
	facilityId: string;
	data: Record<string, unknown>;
}

interface ReminderData {
	courtName: string;
	startTime: string;
	endTime: string;
	facilityName: string;
	minutesBefore: number;
}

interface WaitlistOfferData {
	courtName: string;
	startTime: string;
	endTime: string;
	facilityName: string;
	offerExpiresAt: string;
	acceptUrl: string;
}

interface CancellationData {
	courtName: string;
	startTime: string;
	facilityName: string;
	penaltyApplied: boolean;
}

// ============================================================================
// Worker
// ============================================================================

export default {
	/**
	 * Cron handler - runs every 15 minutes
	 * Queues upcoming reminders and checks for no-shows
	 */
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log('Notification worker cron triggered');

		try {
			// 1. Queue reminders for reservations starting in 24 hours
			await queueReminders(env, 24 * 60);

			// 2. Queue reminders for reservations starting in 2 hours
			await queueReminders(env, 2 * 60);

			// 3. Check for no-shows (reservations that ended without check-in)
			await checkForNoShows(env);

			// 4. Clean up expired waitlist offers
			await cleanupExpiredOffers(env);
		} catch (error) {
			console.error('Cron handler error:', error);
		}
	},

	/**
	 * Queue consumer - processes notification messages
	 */
	async queue(batch: MessageBatch<NotificationMessage>, env: Env): Promise<void> {
		for (const message of batch.messages) {
			try {
				await processNotification(message.body, env);
				message.ack();
			} catch (error) {
				console.error('Queue message processing error:', error);
				// Retry on transient errors, give up on permanent errors
				if (isTransientError(error)) {
					message.retry();
				} else {
					message.ack(); // Don't retry permanent errors
				}
			}
		}
	}
} satisfies ExportedHandler<Env>;

// ============================================================================
// Reminder Queueing
// ============================================================================

async function queueReminders(env: Env, minutesBefore: number): Promise<void> {
	const now = new Date();
	const targetTime = new Date(now.getTime() + minutesBefore * 60 * 1000);

	// Find reservations starting at the target time (+/- 15 min window)
	const windowStart = new Date(targetTime.getTime() - 15 * 60 * 1000).toISOString();
	const windowEnd = new Date(targetTime.getTime() + 15 * 60 * 1000).toISOString();

	const reservations = await env.DB.prepare(
		`
    SELECT r.*, c.name as court_name, f.name as facility_name, m.email, m.phone, m.preferences
    FROM reservations r
    JOIN courts c ON r.court_id = c.id
    JOIN facilities f ON r.facility_id = f.id
    JOIN members m ON r.member_id = m.id
    WHERE r.status = 'confirmed'
      AND r.start_time >= ?
      AND r.start_time <= ?
      AND r.id NOT IN (
        -- Don't send duplicate reminders
        SELECT reservation_id FROM notification_log
        WHERE notification_type = 'reminder'
          AND minutes_before = ?
          AND sent_at > datetime('now', '-30 minutes')
      )
  `
	)
		.bind(windowStart, windowEnd, minutesBefore)
		.all<
			Reservation & {
				court_name: string;
				facility_name: string;
				email: string;
				phone: string | null;
				preferences: string;
			}
		>();

	if (!reservations.results || reservations.results.length === 0) {
		return;
	}

	console.log(`Queueing ${reservations.results.length} reminders (${minutesBefore}m before)`);

	// Queue notification for each reservation
	for (const res of reservations.results) {
		const message: NotificationMessage = {
			type: 'reminder',
			reservationId: res.id,
			memberId: res.member_id,
			facilityId: res.facility_id,
			data: {
				courtName: res.court_name,
				startTime: res.start_time,
				endTime: res.end_time,
				facilityName: res.facility_name,
				minutesBefore,
				email: res.email,
				phone: res.phone,
				preferences: JSON.parse(res.preferences)
			}
		};

		await env.NOTIFICATION_QUEUE.send(message);
	}
}

// ============================================================================
// No-Show Detection
// ============================================================================

async function checkForNoShows(env: Env): Promise<void> {
	const now = new Date().toISOString();

	// Find confirmed reservations that have ended without check-in
	const noShows = await env.DB.prepare(
		`
    SELECT r.*, m.email, m.phone, f.no_show_penalty_credits
    FROM reservations r
    JOIN members m ON r.member_id = m.id
    JOIN facilities f ON r.facility_id = f.id
    WHERE r.status = 'confirmed'
      AND r.end_time < ?
      AND r.checked_in_at IS NULL
      AND r.end_time > datetime('now', '-2 hours') -- Only process recent no-shows
  `
	)
		.bind(now)
		.all<
			Reservation & {
				email: string;
				phone: string | null;
				no_show_penalty_credits: number;
			}
		>();

	if (!noShows.results || noShows.results.length === 0) {
		return;
	}

	console.log(`Detected ${noShows.results.length} no-shows`);

	// Process each no-show
	for (const res of noShows.results) {
		// Update reservation status
		await env.DB.prepare(
			`
      UPDATE reservations
      SET status = 'no_show', updated_at = ?
      WHERE id = ?
    `
		)
			.bind(now, res.id)
			.run();

		// Increment member's no-show count
		await env.DB.prepare(
			`
      UPDATE members
      SET no_show_count = no_show_count + 1, updated_at = ?
      WHERE id = ?
    `
		)
			.bind(now, res.member_id)
			.run();

		// Log no-show
		await env.DB.prepare(
			`
      INSERT INTO no_show_log (id, reservation_id, member_id, recorded_at, penalty_credits)
      VALUES (?, ?, ?, ?, ?)
    `
		)
			.bind(
				crypto.randomUUID(),
				res.id,
				res.member_id,
				now,
				res.no_show_penalty_credits
			)
			.run();

		// TODO: Send notification about no-show penalty
		// TODO: Notify waitlist about freed slot
	}
}

// ============================================================================
// Expired Offer Cleanup
// ============================================================================

async function cleanupExpiredOffers(env: Env): Promise<void> {
	const now = new Date().toISOString();

	// Find expired waitlist offers
	const expired = await env.DB.prepare(
		`
    SELECT id, offered_reservation_id
    FROM waitlist
    WHERE status = 'offered'
      AND offer_expires_at < ?
  `
	)
		.bind(now)
		.all<{ id: string; offered_reservation_id: string }>();

	if (!expired.results || expired.results.length === 0) {
		return;
	}

	console.log(`Cleaning ${expired.results.length} expired waitlist offers`);

	// Batch expire all of them
	const statements = expired.results.flatMap((e) => [
		env.DB.prepare(
			`
      UPDATE reservations
      SET status = 'cancelled', cancelled_at = ?, cancellation_reason = 'Waitlist offer expired', updated_at = ?
      WHERE id = ? AND status = 'pending'
    `
		).bind(now, now, e.offered_reservation_id),
		env.DB.prepare(
			`
      UPDATE waitlist
      SET status = 'expired', updated_at = ?
      WHERE id = ?
    `
		).bind(now, e.id)
	]);

	await env.DB.batch(statements);
}

// ============================================================================
// Notification Processing
// ============================================================================

async function processNotification(message: NotificationMessage, env: Env): Promise<void> {
	switch (message.type) {
		case 'reminder':
			await sendReminder(message, env);
			break;
		case 'waitlist_offer':
			await sendWaitlistOffer(message, env);
			break;
		case 'waitlist_auto_booked':
			await sendWaitlistAutoBooked(message, env);
			break;
		case 'cancellation':
			await sendCancellation(message, env);
			break;
		case 'confirmation':
			await sendConfirmation(message, env);
			break;
		default:
			console.warn('Unknown notification type:', (message as { type: string }).type);
	}

	// Log notification
	await logNotification(message, env);
}

async function sendReminder(message: NotificationMessage, env: Env): Promise<void> {
	const data = message.data as ReminderData & {
		email: string;
		phone: string | null;
		preferences: { notification_sms?: boolean; notification_email?: boolean };
	};

	const timeUntil =
		data.minutesBefore >= 60 ? `${data.minutesBefore / 60} hours` : `${data.minutesBefore} minutes`;
	const subject = `Reminder: Court reservation in ${timeUntil}`;
	const body = `Your court is reserved at ${data.facilityName} in ${timeUntil}.\n\nCourt: ${data.courtName}\nTime: ${new Date(data.startTime).toLocaleString()}`;

	// Send email if preference enabled
	if (data.preferences.notification_email !== false) {
		await sendEmail(env, data.email, subject, body);
	}

	// Send SMS if preference enabled and phone available
	if (data.preferences.notification_sms && data.phone) {
		await sendSMS(env, data.phone, body);
	}
}

async function sendWaitlistOffer(message: NotificationMessage, env: Env): Promise<void> {
	const data = message.data as WaitlistOfferData & {
		email: string;
		phone: string | null;
	};

	const subject = `Court available! Your waitlist slot opened`;
	const body = `A court is now available at ${data.facilityName}!\n\nCourt: ${data.courtName}\nTime: ${new Date(data.startTime).toLocaleString()}\n\nAccept by ${new Date(data.offerExpiresAt).toLocaleString()}:\n${data.acceptUrl}`;

	await sendEmail(env, data.email, subject, body);

	if (data.phone) {
		await sendSMS(env, data.phone, body);
	}
}

async function sendWaitlistAutoBooked(message: NotificationMessage, env: Env): Promise<void> {
	const data = message.data as {
		courtName: string;
		startTime: string;
		facilityName: string;
		email: string;
		phone: string | null;
	};

	const subject = `Automatically booked: Your waitlist slot`;
	const body = `Great news! You've been automatically booked for a court at ${data.facilityName}.\n\nCourt: ${data.courtName}\nTime: ${new Date(data.startTime).toLocaleString()}`;

	await sendEmail(env, data.email, subject, body);

	if (data.phone) {
		await sendSMS(env, data.phone, body);
	}
}

async function sendCancellation(message: NotificationMessage, env: Env): Promise<void> {
	const data = message.data as CancellationData & { email: string; phone: string | null };

	const subject = `Reservation cancelled`;
	const body = `Your reservation has been cancelled.\n\nCourt: ${data.courtName}\nTime: ${new Date(data.startTime).toLocaleString()}\n${data.penaltyApplied ? '\nA cancellation fee was applied.' : ''}`;

	await sendEmail(env, data.email, subject, body);

	if (data.phone) {
		await sendSMS(env, data.phone, body);
	}
}

async function sendConfirmation(message: NotificationMessage, env: Env): Promise<void> {
	const data = message.data as {
		courtName: string;
		startTime: string;
		endTime: string;
		facilityName: string;
		email: string;
		phone: string | null;
	};

	const subject = `Reservation confirmed`;
	const body = `Your court reservation is confirmed!\n\nFacility: ${data.facilityName}\nCourt: ${data.courtName}\nTime: ${new Date(data.startTime).toLocaleString()} - ${new Date(data.endTime).toLocaleString()}`;

	await sendEmail(env, data.email, subject, body);

	if (data.phone) {
		await sendSMS(env, data.phone, body);
	}
}

// ============================================================================
// Notification Channels
// ============================================================================

async function sendEmail(env: Env, to: string, subject: string, body: string): Promise<void> {
	if (!env.SENDGRID_API_KEY) {
		console.warn('SENDGRID_API_KEY not configured, skipping email');
		return;
	}

	const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			personalizations: [{ to: [{ email: to }] }],
			from: { email: 'noreply@courtreserve.createsomething.space', name: 'Court Reserve' },
			subject,
			content: [{ type: 'text/plain', value: body }]
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`SendGrid error: ${error}`);
	}

	console.log(`Email sent to ${to}`);
}

async function sendSMS(env: Env, to: string, body: string): Promise<void> {
	if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
		console.warn('Twilio not configured, skipping SMS');
		return;
	}

	const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString(
		'base64'
	);

	const formData = new URLSearchParams({
		To: to,
		From: env.TWILIO_FROM_NUMBER,
		Body: body
	});

	const response = await fetch(
		`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
		{
			method: 'POST',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: formData
		}
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Twilio error: ${error}`);
	}

	console.log(`SMS sent to ${to}`);
}

// ============================================================================
// Notification Logging
// ============================================================================

async function logNotification(message: NotificationMessage, env: Env): Promise<void> {
	const now = new Date().toISOString();

	await env.DB.prepare(
		`
    INSERT INTO notification_log (id, notification_type, reservation_id, waitlist_id, member_id, facility_id, sent_at, data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
	)
		.bind(
			crypto.randomUUID(),
			message.type,
			message.reservationId || null,
			message.waitlistId || null,
			message.memberId,
			message.facilityId,
			now,
			JSON.stringify(message.data)
		)
		.run();
}

// ============================================================================
// Error Handling
// ============================================================================

function isTransientError(error: unknown): boolean {
	if (error instanceof Error) {
		// Network errors, rate limits, etc.
		return (
			error.message.includes('timeout') ||
			error.message.includes('rate limit') ||
			error.message.includes('429') ||
			error.message.includes('503')
		);
	}
	return false;
}

// ============================================================================
// Env Interface
// ============================================================================

interface Env {
	DB: D1Database;
	NOTIFICATION_QUEUE: Queue;
	SENDGRID_API_KEY?: string;
	TWILIO_ACCOUNT_SID?: string;
	TWILIO_AUTH_TOKEN?: string;
	TWILIO_FROM_NUMBER?: string;
}
