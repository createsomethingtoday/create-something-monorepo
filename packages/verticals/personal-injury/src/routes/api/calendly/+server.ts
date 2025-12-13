/**
 * Calendly Webhook Endpoint
 *
 * Receives Calendly event notifications.
 * When a consultation is booked:
 * 1. Stores to D1 database (consultations table)
 * 2. WORKWAY handles the Calendly → Clio sync automatically
 *
 * WORKWAY Workflow: "Consultation Booking to Clio"
 *
 * Calendly Webhook Events:
 * - invitee.created: New booking
 * - invitee.canceled: Booking canceled
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface CalendlyEvent {
	event: 'invitee.created' | 'invitee.canceled';
	payload: {
		event: {
			uuid: string;
			start_time: string;
			end_time: string;
			name: string; // Event type name
		};
		invitee: {
			uuid: string;
			name: string;
			email: string;
			text_reminder_number?: string;
			questions_and_answers?: Array<{
				question: string;
				answer: string;
			}>;
		};
	};
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const webhookEvent: CalendlyEvent = await request.json();

		console.log('[Calendly] Webhook received:', webhookEvent.event);

		const { event, payload } = webhookEvent;
		const { invitee } = payload;
		const calendarEvent = payload.event;

		// Extract phone from questions if provided
		const phone = invitee.text_reminder_number || null;

		// Extract practice area from custom questions if configured
		const practiceAreaQuestion = invitee.questions_and_answers?.find(
			(qa) => qa.question.toLowerCase().includes('practice area') || qa.question.toLowerCase().includes('legal matter')
		);
		const practiceArea = practiceAreaQuestion?.answer || null;

		// Extract notes from questions
		const notesQuestion = invitee.questions_and_answers?.find(
			(qa) =>
				qa.question.toLowerCase().includes('describe') ||
				qa.question.toLowerCase().includes('details') ||
				qa.question.toLowerCase().includes('about')
		);
		const notes = notesQuestion?.answer || null;

		// Calculate duration from start/end times
		const startTime = new Date(calendarEvent.start_time);
		const endTime = new Date(calendarEvent.end_time);
		const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

		if (event === 'invitee.created') {
			// New consultation booked
			if (platform?.env?.DB) {
				await platform.env.DB.prepare(`
					INSERT INTO consultations (
						calendly_event_id,
						calendly_invitee_id,
						name,
						email,
						phone,
						scheduled_at,
						duration_minutes,
						consultation_type,
						practice_area,
						notes,
						status,
						created_at,
						updated_at
					)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', datetime('now'), datetime('now'))
					ON CONFLICT(calendly_event_id) DO UPDATE SET
						name = excluded.name,
						email = excluded.email,
						phone = excluded.phone,
						scheduled_at = excluded.scheduled_at,
						duration_minutes = excluded.duration_minutes,
						practice_area = excluded.practice_area,
						notes = excluded.notes,
						status = 'scheduled',
						updated_at = datetime('now')
				`)
					.bind(
						calendarEvent.uuid,
						invitee.uuid,
						invitee.name,
						invitee.email.toLowerCase(),
						phone,
						calendarEvent.start_time,
						durationMinutes,
						calendarEvent.name, // Event type name as consultation type
						practiceArea,
						notes
					)
					.run();

				console.log('[Calendly] Consultation stored:', {
					event_id: calendarEvent.uuid,
					email: invitee.email,
					scheduled_at: calendarEvent.start_time
				});
			}

			return json({
				success: true,
				message: 'Consultation booking received'
			});
		}

		if (event === 'invitee.canceled') {
			// Consultation canceled
			if (platform?.env?.DB) {
				await platform.env.DB.prepare(`
					UPDATE consultations
					SET status = 'cancelled', updated_at = datetime('now')
					WHERE calendly_event_id = ?
				`)
					.bind(calendarEvent.uuid)
					.run();

				console.log('[Calendly] Consultation cancelled:', calendarEvent.uuid);
			}

			return json({
				success: true,
				message: 'Consultation cancellation received'
			});
		}

		// Unknown event type
		console.log('[Calendly] Unknown event type:', event);
		return json({ success: true, message: 'Event acknowledged' });
	} catch (err) {
		console.error('[Calendly Webhook Error]', err);
		throw error(500, 'Webhook processing failed');
	}
};

// Calendly sends a GET request to verify webhook URL
export const GET: RequestHandler = async () => {
	return json({ status: 'ok', service: 'law-firm-calendly-webhook' });
};
