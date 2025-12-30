/**
 * Accept Waitlist Offer
 *
 * Member accepts a waitlist offer to confirm the held reservation.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { acceptOffer } from '$lib/scheduling/waitlist';

interface AcceptRequest {
	waitlistId: string;
	memberId: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform) {
		throw error(500, 'Platform not available');
	}

	const { waitlistId, memberId } = (await request.json()) as AcceptRequest;

	if (!waitlistId || !memberId) {
		throw error(400, 'Missing required fields');
	}

	// Accept the offer
	const result = await acceptOffer(platform.env.DB, waitlistId, memberId);

	if (!result.success) {
		throw error(400, result.error || 'Failed to accept offer');
	}

	// Send confirmation notification
	if (result.reservationId && platform.env.NOTIFICATION_QUEUE) {
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
			.bind(result.reservationId)
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
				reservationId: result.reservationId,
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

	return json({
		success: true,
		reservationId: result.reservationId
	});
};
