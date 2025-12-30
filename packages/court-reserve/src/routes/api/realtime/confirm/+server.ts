/**
 * Confirm Real-time Booking
 *
 * Called after payment succeeds to confirm the held slot.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ConfirmRequest {
	courtId: string;
	startTime: string;
	reservationId: string;
	facilityId: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform) {
		throw error(500, 'Platform not available');
	}

	const { courtId, startTime, reservationId, facilityId } = (await request.json()) as ConfirmRequest;

	if (!courtId || !startTime || !reservationId || !facilityId) {
		throw error(400, 'Missing required fields');
	}

	// Get Durable Object instance
	const id = platform.env.COURT_STATE.idFromName(facilityId);
	const stub = platform.env.COURT_STATE.get(id);

	// Forward confirm request to DO
	const doRequest = new Request('https://dummy/confirm', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			courtId,
			startTime,
			reservationId
		})
	});

	const response = await stub.fetch(doRequest);
	const result = (await response.json()) as { success: boolean };

	// If confirmation succeeded, send confirmation notification
	if (result.success && platform.env.NOTIFICATION_QUEUE) {
		// Fetch reservation and member details for notification
		const reservation = await platform.env.DB.prepare(
			`
      SELECT r.*, c.name as court_name, f.name as facility_name, m.email, m.phone
      FROM reservations r
      JOIN courts c ON r.court_id = c.id
      JOIN facilities f ON r.facility_id = f.id
      JOIN members m ON r.member_id = m.id
      WHERE r.id = ?
    `
		)
			.bind(reservationId)
			.first<{
				member_id: string;
				facility_id: string;
				start_time: string;
				end_time: string;
				court_name: string;
				facility_name: string;
				email: string;
				phone: string | null;
			}>();

		if (reservation) {
			await platform.env.NOTIFICATION_QUEUE.send({
				type: 'confirmation',
				reservationId,
				memberId: reservation.member_id,
				facilityId: reservation.facility_id,
				data: {
					courtName: reservation.court_name,
					startTime: reservation.start_time,
					endTime: reservation.end_time,
					facilityName: reservation.facility_name,
					email: reservation.email,
					phone: reservation.phone
				}
			});
		}
	}

	return json(result);
};
