/**
 * Real-time Booking Attempt
 *
 * Proxies to the CourtStateManager Durable Object
 * for single-threaded, race-condition-free booking.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface AttemptRequest {
	courtId: string;
	startTime: string;
	endTime: string;
	memberId: string;
	facilityId: string;
	durationMinutes: number;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform) {
		throw error(500, 'Platform not available');
	}

	const { courtId, startTime, endTime, memberId, facilityId, durationMinutes } =
		(await request.json()) as AttemptRequest;

	// Validate required fields
	if (!courtId || !startTime || !endTime || !memberId || !facilityId || !durationMinutes) {
		throw error(400, 'Missing required fields');
	}

	// Get Durable Object instance for this facility
	const id = platform.env.COURT_STATE.idFromName(facilityId);
	const stub = platform.env.COURT_STATE.get(id);

	// Forward attempt request to DO
	const doRequest = new Request('https://dummy/attempt', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			courtId,
			startTime,
			endTime,
			memberId,
			durationMinutes
		})
	});

	const response = await stub.fetch(doRequest);
	const result = await response.json();

	return json(result);
};
