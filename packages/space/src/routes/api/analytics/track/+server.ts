import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { trackAnalyticsEvent } from '@create-something/components/lib/analytics/track.js';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const result = await trackAnalyticsEvent(db, request);
	return json(
		result.error ? { error: result.error } : { success: result.success },
		{ status: result.status }
	);
};
