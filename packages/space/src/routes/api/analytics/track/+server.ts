import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AnalyticsEventRequest } from '@create-something/components/types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const { event_type, property, path, experiment_id, tag_id, referrer } =
			(await request.json()) as AnalyticsEventRequest;

		if (!event_type) {
			return json({ error: 'event_type is required' }, { status: 400 });
		}

		// Get user agent and country from request headers
		const user_agent = request.headers.get('user-agent') || '';
		const country = request.headers.get('cf-ipcountry') || '';

		// Insert analytics event
		await db
			.prepare(
				`INSERT INTO analytics_events (event_type, property, path, experiment_id, tag_id, referrer, user_agent, country)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				event_type,
				property || null,
				path || null,
				experiment_id || null,
				tag_id || null,
				referrer || null,
				user_agent,
				country
			)
			.run();

		return json({ success: true }, { status: 201 });
	} catch (error) {
		console.error('Failed to track analytics event:', error);
		// Don't fail the request if analytics fails - just log it
		return json({ success: false }, { status: 200 });
	}
};
