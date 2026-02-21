/**
 * Video View Increment API
 *
 * Increments view count in KV (primary). If KV is unavailable, records the view in D1 events.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function toNumber(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

function buildEventId(): string {
	return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const POST: RequestHandler = async ({ params, platform }) => {
	const { id } = params;
	const kv = platform?.env?.VIDEO_STATS;
	const db = platform?.env?.DB;

	if (!id) {
		return json({ error: 'Video ID required' }, { status: 400 });
	}

	try {
		if (kv) {
			const key = `views:${id}`;
			const current = await kv.get(key);
			const newViews = toNumber(current) + 1;
			await kv.put(key, newViews.toString());

			return json({ id, views: newViews, live: true });
		}

		if (db) {
			const now = Date.now();
			const eventId = buildEventId();
			const sessionId = `view_${id}_${now}`;

			await db
				.prepare(
					`INSERT INTO user_events (
						id, event_type, user_id, session_id,
						page, component, action,
						metadata,
						error_message, error_stack, error_component_stack,
						duration_ms, performance_metric,
						created_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					eventId,
					'video_play',
					null,
					sessionId,
					`/watch/${id}`,
					'video-player',
					'view_increment',
					JSON.stringify({ videoId: id, source: 'view-endpoint' }),
					null,
					null,
					null,
					null,
					null,
					now
				)
				.run();

			const result = await db
				.prepare(
					`SELECT COUNT(*) as count
					 FROM user_events
					 WHERE event_type = 'video_play'
					   AND json_extract(metadata, '$.videoId') = ?`
				)
				.bind(id)
				.first<{ count: number }>();

			return json({ id, views: toNumber(result?.count), live: false });
		}

		return json({ id, views: 0, live: false });
	} catch (error) {
		console.error('Video view increment error:', error);
		return json({ error: 'Failed to increment view' }, { status: 500 });
	}
};
