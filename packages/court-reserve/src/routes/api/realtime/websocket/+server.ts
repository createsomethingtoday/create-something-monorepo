/**
 * WebSocket Connection for Real-time Updates
 *
 * Upgrade to WebSocket and forward to Durable Object.
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform) {
		throw error(500, 'Platform not available');
	}

	const facilityId = url.searchParams.get('facilityId');

	if (!facilityId) {
		throw error(400, 'facilityId required');
	}

	// Get Durable Object instance
	const id = platform.env.COURT_STATE.idFromName(facilityId);
	const stub = platform.env.COURT_STATE.get(id);

	// Forward WebSocket upgrade to DO
	const doRequest = new Request(`https://dummy/websocket?facilityId=${facilityId}`, {
		headers: {
			Upgrade: 'websocket'
		}
	});

	return stub.fetch(doRequest);
};
