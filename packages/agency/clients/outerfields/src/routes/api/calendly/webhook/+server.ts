import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { createDiscoveryCall, updateDiscoveryCallStatus } from '$lib/server/db/discovery-calls';

/**
 * POST /api/calendly/webhook
 * Handles Calendly webhook events for discovery call scheduling
 *
 * Webhook events:
 * - invitee.created: New discovery call scheduled
 * - invitee.canceled: Discovery call cancelled
 * - invitee.rescheduled: Discovery call rescheduled (not directly supported, but handled as cancel + create)
 */
export async function POST({ request, platform }: RequestEvent) {
	const db = platform?.env.DB;

	if (!db) {
		console.error('Database not available');
		return json({ success: false, error: 'Database unavailable' }, { status: 500 });
	}

	try {
		const payload = await request.json();
		const event = payload.event;
		const eventType = payload.event_type;

		console.log('Calendly webhook received:', eventType);

		switch (eventType) {
			case 'invitee.created': {
				// New discovery call scheduled
				const eventUri = event.uri;
				const startTime = event.start_time;
				const inviteeEmail = event.email;

				console.log('Discovery call scheduled:', {
					eventUri,
					startTime,
					inviteeEmail
				});

				// Look up user by email
				const userResult = await db
					.prepare('SELECT id FROM users WHERE email = ?')
					.bind(inviteeEmail)
					.first<{ id: string }>();

				if (!userResult) {
					console.warn(`No user found for email: ${inviteeEmail}`);
					// Still return success to Calendly, but log warning
					return json({ success: true, warning: 'User not found' });
				}

				// Create discovery call record
				await createDiscoveryCall(db, userResult.id, startTime, eventUri);

				console.log(`Discovery call created for user ${userResult.id}`);
				break;
			}

			case 'invitee.canceled': {
				// Discovery call cancelled
				const eventUri = event.uri;

				console.log('Discovery call cancelled:', eventUri);

				// Update status to cancelled
				await updateDiscoveryCallStatus(db, eventUri, 'cancelled');

				console.log(`Discovery call ${eventUri} marked as cancelled`);
				break;
			}

			default:
				console.log(`Unhandled Calendly event type: ${eventType}`);
		}

		return json({ success: true, received: true });
	} catch (err) {
		console.error('Error processing Calendly webhook:', err);
		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : 'Failed to process webhook'
			},
			{ status: 500 }
		);
	}
}
