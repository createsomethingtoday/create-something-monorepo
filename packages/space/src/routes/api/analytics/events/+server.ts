/**
 * Unified Analytics Events Endpoint
 *
 * Receives batched analytics events from the client and stores them in D1.
 * Uses the unified schema from @create-something/components.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processEventBatch, type EventBatch } from '@create-something/components/analytics';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	try {
		const batch = (await request.json()) as EventBatch;

		// Validate batch structure
		if (!batch || !Array.isArray(batch.events)) {
			return json({ success: false, error: 'Invalid batch format' }, { status: 400 });
		}

		// Extract context from request headers
		const context = {
			userAgent: request.headers.get('user-agent') || undefined,
			ipCountry: request.headers.get('cf-ipcountry') || undefined,
		};

		// Process the batch
		const result = await processEventBatch(db, batch, context);

		return json(result, { status: result.success ? 200 : 207 });
	} catch (error) {
		console.error('Analytics events error:', error);
		// Analytics should never break the user experience
		return json({ success: false, received: 0 }, { status: 200 });
	}
};

// Health check
export const GET: RequestHandler = async () => {
	return json({ status: 'ok', endpoint: 'unified-analytics' });
};
