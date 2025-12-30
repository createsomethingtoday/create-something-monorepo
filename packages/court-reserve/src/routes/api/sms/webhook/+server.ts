/**
 * SMS Webhook Endpoint
 *
 * POST /api/sms/webhook - Receive and process Twilio SMS messages
 *
 * Flow:
 * 1. Verify Twilio signature
 * 2. Look up facility by phone number
 * 3. Look up or create member by phone
 * 4. Parse intent using AI
 * 5. Process conversation state
 * 6. Execute booking action if needed
 * 7. Return TwiML response
 */

import type { RequestHandler } from './$types';
import {
	parseIncomingSMS,
	verifyTwilioSignature,
	twimlResponse,
	twimlEmpty,
	normalizePhone
} from '$lib/sms/twilio';
import { parseIntent } from '$lib/sms/intent-parser';
import {
	getConversation,
	saveConversation,
	clearConversation,
	processIntent
} from '$lib/sms/conversation';

export const POST: RequestHandler = async ({ request, platform, url }) => {
	const db = platform?.env.DB;
	const kv = platform?.env.SESSIONS;
	const ai = platform?.env.AI;
	const twilioAccountSid = platform?.env.TWILIO_ACCOUNT_SID;
	const twilioAuthToken = platform?.env.TWILIO_AUTH_TOKEN;

	if (!db || !kv || !ai) {
		console.error('Missing required bindings');
		return new Response(twimlEmpty(), {
			headers: { 'Content-Type': 'text/xml' }
		});
	}

	// Parse form data
	const formData = await request.formData();
	const sms = parseIncomingSMS(formData);

	// Verify signature in production
	if (twilioAccountSid && twilioAuthToken) {
		const signature = request.headers.get('X-Twilio-Signature') || '';
		const params: Record<string, string> = {};
		formData.forEach((value, key) => {
			params[key] = value.toString();
		});

		if (!verifyTwilioSignature(twilioAuthToken, signature, url.toString(), params)) {
			console.error('Invalid Twilio signature');
			return new Response(twimlEmpty(), {
				status: 403,
				headers: { 'Content-Type': 'text/xml' }
			});
		}
	}

	// Look up facility by receiving phone number
	const facility = await db
		.prepare('SELECT id, name, slug FROM facilities WHERE sms_number = ?')
		.bind(sms.to)
		.first<{ id: string; name: string; slug: string }>();

	if (!facility) {
		console.error(`No facility found for phone number: ${sms.to}`);
		return new Response(
			twimlResponse("Sorry, this number isn't set up for bookings yet."),
			{ headers: { 'Content-Type': 'text/xml' } }
		);
	}

	// Look up or create member by phone
	const phone = normalizePhone(sms.from);
	let member = await db
		.prepare('SELECT id, name FROM members WHERE facility_id = ? AND phone = ?')
		.bind(facility.id, phone)
		.first<{ id: string; name: string }>();

	if (!member) {
		// Create placeholder member (will collect name later)
		const memberId = `mem_${Date.now()}`;
		const now = new Date().toISOString();
		await db
			.prepare(`INSERT INTO members (id, facility_id, phone, status, created_at, updated_at)
				VALUES (?, ?, ?, 'active', ?, ?)`)
			.bind(memberId, facility.id, phone, now, now)
			.run();
		member = { id: memberId, name: '' };
	}

	// Get or create conversation context
	const context = await getConversation(kv, phone, facility.id);
	context.memberId = member.id;

	// Parse intent using AI
	const parsed = await parseIntent(sms.body, ai);
	console.log(`Intent: ${parsed.intent.type} (${parsed.confidence})`, parsed.entities);

	// Process intent through conversation state machine
	const result = processIntent(context, parsed.intent);

	// Execute action if needed
	if (result.action === 'book' && result.newContext.state === 'complete') {
		try {
			const booking = await executeBooking(db, result.newContext, facility.id);
			if (booking.success) {
				result.response = `Booked! ${booking.details}\n\nReply STATUS to see your bookings.`;
				await clearConversation(kv, phone, facility.id);
			} else {
				result.response = `Sorry, couldn't complete the booking: ${booking.error}\n\nTry again with BOOK.`;
				result.newContext.state = 'idle';
			}
		} catch (err) {
			console.error('Booking error:', err);
			result.response = 'Sorry, something went wrong. Please try again.';
			result.newContext.state = 'idle';
		}
	}

	// Handle status request
	if (parsed.intent.type === 'status') {
		const reservations = await getUpcomingReservations(db, member.id);
		if (reservations.length === 0) {
			result.response = "You don't have any upcoming reservations.";
		} else {
			result.response = "Your upcoming reservations:\n\n" +
				reservations.map((r, i) =>
					`${i + 1}. Court ${r.court_number} - ${formatDateTime(r.start_time)}`
				).join('\n');
		}
	}

	// Save conversation state
	if (result.newContext.state !== 'idle') {
		await saveConversation(kv, result.newContext);
	}

	// Log for analytics
	await db
		.prepare(`INSERT INTO sms_logs (id, facility_id, member_id, direction, phone, body, intent, created_at)
			VALUES (?, ?, ?, 'inbound', ?, ?, ?, ?)`)
		.bind(
			`sms_${Date.now()}`,
			facility.id,
			member.id,
			phone,
			sms.body.substring(0, 500),
			parsed.intent.type,
			new Date().toISOString()
		)
		.run();

	return new Response(twimlResponse(result.response), {
		headers: { 'Content-Type': 'text/xml' }
	});
};

/**
 * Execute a booking from conversation context
 */
async function executeBooking(
	db: D1Database,
	context: {
		court?: string;
		date?: string;
		time?: string;
		duration?: number;
		memberId?: string;
	},
	facilityId: string
): Promise<{ success: boolean; details?: string; error?: string }> {
	if (!context.court || !context.date || !context.time || !context.memberId) {
		return { success: false, error: 'Missing booking information' };
	}

	// Parse date/time
	const startTime = parseBookingDateTime(context.date, context.time);
	if (!startTime) {
		return { success: false, error: 'Could not parse date/time' };
	}

	const duration = context.duration || 60;
	const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

	// Look up court
	const court = await db
		.prepare('SELECT id, name FROM courts WHERE facility_id = ? AND court_number = ?')
		.bind(facilityId, parseInt(context.court, 10))
		.first<{ id: string; name: string }>();

	if (!court) {
		return { success: false, error: `Court ${context.court} not found` };
	}

	// Check availability
	const conflict = await db
		.prepare(`SELECT id FROM reservations
			WHERE court_id = ?
			AND status IN ('confirmed', 'pending')
			AND start_time < ?
			AND end_time > ?`)
		.bind(court.id, endTime.toISOString(), startTime.toISOString())
		.first();

	if (conflict) {
		return { success: false, error: 'That time slot is already booked' };
	}

	// Create reservation
	const reservationId = `res_${Date.now()}`;
	const now = new Date().toISOString();

	await db
		.prepare(`INSERT INTO reservations
			(id, facility_id, court_id, member_id, start_time, end_time, status, booking_source, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, 'confirmed', 'sms', ?, ?)`)
		.bind(
			reservationId,
			facilityId,
			court.id,
			context.memberId,
			startTime.toISOString(),
			endTime.toISOString(),
			now,
			now
		)
		.run();

	return {
		success: true,
		details: `Court ${context.court} on ${formatDateTime(startTime.toISOString())}`
	};
}

/**
 * Get upcoming reservations for a member
 */
async function getUpcomingReservations(
	db: D1Database,
	memberId: string
): Promise<Array<{ court_number: number; start_time: string }>> {
	const now = new Date().toISOString();
	const { results } = await db
		.prepare(`SELECT c.court_number, r.start_time
			FROM reservations r
			JOIN courts c ON c.id = r.court_id
			WHERE r.member_id = ?
			AND r.status IN ('confirmed', 'pending')
			AND r.start_time > ?
			ORDER BY r.start_time
			LIMIT 5`)
		.bind(memberId, now)
		.all<{ court_number: number; start_time: string }>();

	return results || [];
}

/**
 * Parse natural language date/time to Date object
 */
function parseBookingDateTime(date: string, time: string): Date | null {
	const now = new Date();
	let targetDate: Date;

	// Parse date
	const dateLower = date.toLowerCase();
	if (dateLower === 'today') {
		targetDate = now;
	} else if (dateLower === 'tomorrow') {
		targetDate = new Date(now);
		targetDate.setDate(targetDate.getDate() + 1);
	} else {
		// Try to parse day name
		const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
		const dayIndex = days.indexOf(dateLower);
		if (dayIndex !== -1) {
			targetDate = new Date(now);
			const currentDay = targetDate.getDay();
			const daysUntil = (dayIndex - currentDay + 7) % 7 || 7;
			targetDate.setDate(targetDate.getDate() + daysUntil);
		} else {
			// Try MM/DD format
			const dateMatch = date.match(/(\d{1,2})\/(\d{1,2})/);
			if (dateMatch) {
				targetDate = new Date(now.getFullYear(), parseInt(dateMatch[1], 10) - 1, parseInt(dateMatch[2], 10));
			} else {
				return null;
			}
		}
	}

	// Parse time
	const timeMatch = time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
	if (!timeMatch) {
		// Check for morning/afternoon/evening
		const timeLower = time.toLowerCase();
		if (timeLower.includes('morning')) {
			targetDate.setHours(9, 0, 0, 0);
		} else if (timeLower.includes('noon')) {
			targetDate.setHours(12, 0, 0, 0);
		} else if (timeLower.includes('afternoon')) {
			targetDate.setHours(14, 0, 0, 0);
		} else if (timeLower.includes('evening')) {
			targetDate.setHours(18, 0, 0, 0);
		} else {
			return null;
		}
	} else {
		let hours = parseInt(timeMatch[1], 10);
		const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
		const meridiem = timeMatch[3]?.toLowerCase();

		if (meridiem === 'pm' && hours < 12) hours += 12;
		if (meridiem === 'am' && hours === 12) hours = 0;

		targetDate.setHours(hours, minutes, 0, 0);
	}

	return targetDate;
}

/**
 * Format datetime for display
 */
function formatDateTime(isoString: string): string {
	const date = new Date(isoString);
	return date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}
