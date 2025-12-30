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
	 * Cron handler
	 * - Every 15 minutes: reminders, no-shows, waitlist cleanup
	 * - Daily at 6am: analytics aggregation, gap detection, pricing suggestions
	 */
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const now = new Date();
		const hour = now.getUTCHours();
		const minute = now.getUTCMinutes();

		// Daily analytics job (runs at 6am UTC = 10pm PST)
		const isDailyJob = hour === 6 && minute < 15;

		if (isDailyJob) {
			console.log('Running daily analytics aggregation');
			await runDailyAnalytics(env);
		} else {
			console.log('Running 15-minute notification cron');
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
// Daily Analytics
// ============================================================================

async function runDailyAnalytics(env: Env): Promise<void> {
	try {
		// Get all active facilities
		const facilities = await env.DB.prepare(
			"SELECT id, name FROM facilities WHERE status = 'active'"
		).all<{ id: string; name: string }>();

		if (!facilities.results || facilities.results.length === 0) {
			console.log('No active facilities found');
			return;
		}

		console.log(`Running analytics for ${facilities.results.length} facilities`);

		for (const facility of facilities.results) {
			try {
				console.log(`Processing facility: ${facility.name} (${facility.id})`);

				// 1. Aggregate hourly utilization
				const utilizationCount = await aggregateHourlyUtilization(env.DB, facility.id);
				console.log(`  - Utilization: ${utilizationCount} records`);

				// 2. Calculate court popularity
				const popularityCount = await aggregateCourtPopularity(env.DB, facility.id);
				console.log(`  - Popularity: ${popularityCount} records`);

				// 3. Detect gaps in next 7 days
				const gapsDetected = await detectGaps(env.DB, facility.id);
				console.log(`  - Gaps detected: ${gapsDetected}`);

				// 4. Generate pricing suggestions
				const suggestionsCount = await generatePricingSuggestions(env.DB, facility.id);
				console.log(`  - Pricing suggestions: ${suggestionsCount}`);

				// 5. Send gap-fill notifications for new gaps
				if (gapsDetected > 0) {
					const unnotifiedGaps = await env.DB.prepare(
						`
            SELECT id FROM analytics_gaps
            WHERE facility_id = ? AND notified = 0
            LIMIT 10
          `
					)
						.bind(facility.id)
						.all<{ id: string }>();

					if (unnotifiedGaps.results) {
						for (const gap of unnotifiedGaps.results) {
							const notificationCount = await sendGapFillNotifications(
								env.DB,
								env.NOTIFICATION_QUEUE,
								gap.id
							);
							console.log(`    - Gap ${gap.id}: ${notificationCount} notifications sent`);
						}
					}
				}

				// 6. Expire old pricing suggestions
				const expiredCount = await expireOldSuggestions(env.DB);
				if (expiredCount > 0) {
					console.log(`  - Expired ${expiredCount} old pricing suggestions`);
				}
			} catch (facilityError) {
				console.error(`Error processing facility ${facility.id}:`, facilityError);
			}
		}

		console.log('Daily analytics completed');
	} catch (error) {
		console.error('Daily analytics error:', error);
		throw error;
	}
}

// Analytics imports (from $lib/analytics and $lib/pricing/dynamic)
// These are copied inline to avoid import issues in Workers

async function aggregateHourlyUtilization(db: D1Database, facilityId: string): Promise<number> {
	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const facility = await db
		.prepare('SELECT slot_duration_minutes, opening_time, closing_time FROM facilities WHERE id = ?')
		.bind(facilityId)
		.first<{ slot_duration_minutes: number; opening_time: string; closing_time: string }>();

	if (!facility) return 0;

	const [openHour] = facility.opening_time.split(':').map(Number);
	const [closeHour] = facility.closing_time.split(':').map(Number);

	const courtsResult = await db
		.prepare('SELECT COUNT(*) as count FROM courts WHERE facility_id = ? AND is_active = 1')
		.bind(facilityId)
		.first<{ count: number }>();

	const totalCourts = courtsResult?.count || 0;
	if (totalCourts === 0) return 0;

	const slotsPerHourPerCourt = 60 / facility.slot_duration_minutes;
	const totalSlotsPerHour = totalCourts * slotsPerHourPerCourt;

	const results = await db
		.prepare(
			`
      SELECT
        CAST(strftime('%w', start_time) AS INTEGER) as day_of_week,
        CAST(strftime('%H', start_time) AS INTEGER) as hour,
        COUNT(*) as booked_slots,
        AVG(rate_cents) as avg_revenue_cents
      FROM reservations
      WHERE facility_id = ? AND start_time >= ? AND start_time < ?
        AND status IN ('confirmed', 'completed', 'in_progress')
      GROUP BY day_of_week, hour
    `
		)
		.bind(facilityId, thirtyDaysAgo.toISOString(), now.toISOString())
		.all<{
			day_of_week: number;
			hour: number;
			booked_slots: number;
			avg_revenue_cents: number | null;
		}>();

	const calculated_at = now.toISOString();
	const insertStatements: D1PreparedStatement[] = [];

	for (let day = 0; day <= 6; day++) {
		for (let hour = openHour; hour < closeHour; hour++) {
			const data = results.results?.find((r) => r.day_of_week === day && r.hour === hour);
			const booked_slots = data?.booked_slots || 0;
			const utilization_rate = booked_slots / totalSlotsPerHour;

			insertStatements.push(
				db
					.prepare(
						`
          INSERT OR REPLACE INTO analytics_hourly (
            id, facility_id, day_of_week, hour, total_slots, booked_slots,
            utilization_rate, avg_revenue_cents, calculated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
					)
					.bind(
						crypto.randomUUID(),
						facilityId,
						day,
						hour,
						totalSlotsPerHour,
						booked_slots,
						utilization_rate,
						data?.avg_revenue_cents || null,
						calculated_at
					)
			);
		}
	}

	await db.batch(insertStatements);
	return insertStatements.length;
}

async function aggregateCourtPopularity(db: D1Database, facilityId: string): Promise<number> {
	const now = new Date();
	const weekAgo = new Date(now);
	weekAgo.setDate(weekAgo.getDate() - 7);
	const monthAgo = new Date(now);
	monthAgo.setDate(monthAgo.getDate() - 30);
	const calculated_at = now.toISOString();

	const courts = await db
		.prepare('SELECT id FROM courts WHERE facility_id = ? AND is_active = 1')
		.bind(facilityId)
		.all<{ id: string }>();

	if (!courts.results || courts.results.length === 0) return 0;

	const insertStatements: D1PreparedStatement[] = [];

	for (const court of courts.results) {
		for (const [period, since] of [
			['weekly', weekAgo],
			['monthly', monthAgo]
		] as const) {
			const stats = await db
				.prepare(
					`
          SELECT COUNT(*) as total_bookings, COALESCE(SUM(rate_cents), 0) as revenue_cents,
            AVG(duration_minutes) as avg_duration_minutes
          FROM reservations
          WHERE facility_id = ? AND court_id = ? AND start_time >= ?
            AND status IN ('confirmed', 'completed', 'in_progress')
        `
				)
				.bind(facilityId, court.id, since.toISOString())
				.first<{ total_bookings: number; revenue_cents: number; avg_duration_minutes: number }>();

			if (stats && stats.total_bookings > 0) {
				insertStatements.push(
					db
						.prepare(
							`
              INSERT OR REPLACE INTO analytics_court_popularity (
                id, facility_id, court_id, period, total_bookings, revenue_cents,
                avg_duration_minutes, calculated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `
						)
						.bind(
							crypto.randomUUID(),
							facilityId,
							court.id,
							period,
							stats.total_bookings,
							stats.revenue_cents,
							Math.round(stats.avg_duration_minutes),
							calculated_at
						)
				);
			}
		}
	}

	if (insertStatements.length > 0) await db.batch(insertStatements);
	return insertStatements.length;
}

async function detectGaps(db: D1Database, facilityId: string): Promise<number> {
	// Simplified gap detection - just find prime time empty slots
	const now = new Date();
	const sevenDaysLater = new Date(now);
	sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

	const facility = await db
		.prepare('SELECT opening_time, closing_time, slot_duration_minutes FROM facilities WHERE id = ?')
		.bind(facilityId)
		.first<{ opening_time: string; closing_time: string; slot_duration_minutes: number }>();

	if (!facility) return 0;

	const peakHours = await db
		.prepare(
			`
      SELECT DISTINCT day_of_week, hour FROM analytics_hourly
      WHERE facility_id = ? AND utilization_rate > 0.8
    `
		)
		.bind(facilityId)
		.all<{ day_of_week: number; hour: number }>();

	if (!peakHours.results || peakHours.results.length === 0) return 0;

	const courts = await db
		.prepare('SELECT id FROM courts WHERE facility_id = ? AND is_active = 1')
		.bind(facilityId)
		.all<{ id: string }>();

	if (!courts.results) return 0;

	const insertStatements: D1PreparedStatement[] = [];
	const created_at = now.toISOString();

	for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
		const checkDate = new Date(now);
		checkDate.setDate(checkDate.getDate() + dayOffset);
		const dateStr = checkDate.toISOString().split('T')[0];
		const dayOfWeek = checkDate.getDay();

		const peakHoursForDay = peakHours.results.filter((p) => p.day_of_week === dayOfWeek);

		for (const court of courts.results) {
			for (const peakHour of peakHoursForDay) {
				const slotStart = new Date(checkDate);
				slotStart.setHours(peakHour.hour, 0, 0, 0);
				const slotEnd = new Date(slotStart);
				slotEnd.setMinutes(facility.slot_duration_minutes);

				const existingReservation = await db
					.prepare(
						`
            SELECT id FROM reservations
            WHERE court_id = ? AND start_time >= ? AND start_time < ?
              AND status IN ('pending', 'confirmed', 'in_progress')
            LIMIT 1
          `
					)
					.bind(court.id, slotStart.toISOString(), slotEnd.toISOString())
					.first<{ id: string }>();

				if (!existingReservation) {
					insertStatements.push(
						db
							.prepare(
								`
                INSERT OR IGNORE INTO analytics_gaps (
                  id, facility_id, court_id, slot_date, slot_hour, gap_type, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
              `
							)
							.bind(
								crypto.randomUUID(),
								facilityId,
								court.id,
								dateStr,
								peakHour.hour,
								'prime_time_empty',
								created_at
							)
					);
				}
			}
		}
	}

	if (insertStatements.length > 0) await db.batch(insertStatements);
	return insertStatements.length;
}

async function generatePricingSuggestions(db: D1Database, facilityId: string): Promise<number> {
	const courts = await db
		.prepare(
			'SELECT id, price_per_slot_cents FROM courts WHERE facility_id = ? AND is_active = 1 AND price_per_slot_cents IS NOT NULL'
		)
		.bind(facilityId)
		.all<{ id: string; price_per_slot_cents: number }>();

	if (!courts.results || courts.results.length === 0) return 0;

	const avgBaseRate =
		courts.results.reduce((sum, c) => sum + c.price_per_slot_cents, 0) / courts.results.length;

	const utilization = await db
		.prepare(
			'SELECT day_of_week, hour, utilization_rate, booked_slots FROM analytics_hourly WHERE facility_id = ?'
		)
		.bind(facilityId)
		.all<{
			day_of_week: number;
			hour: number;
			utilization_rate: number;
			booked_slots: number;
		}>();

	if (!utilization.results) return 0;

	const created_at = new Date().toISOString();
	const insertStatements: D1PreparedStatement[] = [];

	// Simple peak/off-peak detection
	for (const u of utilization.results) {
		if (u.booked_slots < 10) continue; // Need at least 10 bookings for confidence

		let adjustment = 0;
		let reason = '';

		if (u.utilization_rate >= 0.8) {
			adjustment = 50;
			reason = `Peak demand (${(u.utilization_rate * 100).toFixed(0)}% utilization)`;
		} else if (u.utilization_rate <= 0.3) {
			adjustment = -25;
			reason = `Low demand (${(u.utilization_rate * 100).toFixed(0)}% utilization)`;
		} else {
			continue;
		}

		const suggested_rate_cents = Math.round(avgBaseRate * (1 + adjustment / 100));
		const confidence = Math.min(u.booked_slots / 50, 1.0);

		insertStatements.push(
			db
				.prepare(
					`
          INSERT OR IGNORE INTO pricing_suggestions (
            id, facility_id, court_id, day_of_week, hour_start, hour_end,
            suggested_rate_cents, base_rate_cents, adjustment_percent,
            reason, confidence_score, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
				)
				.bind(
					crypto.randomUUID(),
					facilityId,
					null,
					u.day_of_week,
					u.hour,
					u.hour,
					suggested_rate_cents,
					Math.round(avgBaseRate),
					adjustment,
					reason,
					confidence,
					'pending',
					created_at
				)
		);
	}

	if (insertStatements.length > 0) await db.batch(insertStatements);
	return insertStatements.length;
}

async function expireOldSuggestions(db: D1Database): Promise<number> {
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	const result = await db
		.prepare("UPDATE pricing_suggestions SET status = 'expired' WHERE status = 'pending' AND created_at < ?")
		.bind(sevenDaysAgo.toISOString())
		.run();

	return result.meta.changes;
}

async function sendGapFillNotifications(
	db: D1Database,
	queue: Queue,
	gapId: string
): Promise<number> {
	// Check if already sent
	const existingNotifications = await db
		.prepare('SELECT COUNT(*) as count FROM gap_notifications WHERE gap_id = ?')
		.bind(gapId)
		.first<{ count: number }>();

	if ((existingNotifications?.count || 0) >= 5) return 0;

	// Simplified: just get top 5 most active members
	const gap = await db
		.prepare('SELECT * FROM analytics_gaps WHERE id = ?')
		.bind(gapId)
		.first<{
			facility_id: string;
			court_id: string;
			slot_date: string;
			slot_hour: number;
		}>();

	if (!gap) return 0;

	const members = await db
		.prepare(
			`
      SELECT m.id, m.name, m.email, m.phone, COUNT(r.id) as booking_count
      FROM members m
      JOIN reservations r ON r.member_id = m.id
      WHERE m.facility_id = ? AND m.status = 'active'
        AND r.status IN ('confirmed', 'completed')
      GROUP BY m.id
      ORDER BY booking_count DESC
      LIMIT 5
    `
		)
		.bind(gap.facility_id)
		.all<{ id: string; name: string; email: string; phone: string | null; booking_count: number }>();

	if (!members.results) return 0;

	const sent_at = new Date().toISOString();
	let count = 0;

	for (const member of members.results) {
		await db
			.prepare(
				`
        INSERT INTO gap_notifications (
          id, gap_id, member_id, facility_id, match_score, notification_type, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
			)
			.bind(
				crypto.randomUUID(),
				gapId,
				member.id,
				gap.facility_id,
				0.8,
				member.phone ? 'sms' : 'email',
				sent_at
			)
			.run();

		await queue.send({
			type: 'gap_fill',
			gapId,
			memberId: member.id,
			facilityId: gap.facility_id,
			data: {
				email: member.email,
				phone: member.phone,
				slotDate: gap.slot_date,
				slotHour: gap.slot_hour,
				message: `Court available on ${gap.slot_date} at ${gap.slot_hour}:00!`
			}
		});

		count++;
	}

	if (count > 0) {
		await db.prepare('UPDATE analytics_gaps SET notified = 1 WHERE id = ?').bind(gapId).run();
	}

	return count;
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
