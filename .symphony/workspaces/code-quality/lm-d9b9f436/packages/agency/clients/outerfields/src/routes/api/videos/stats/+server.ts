/**
 * Video Stats API
 *
 * Returns view counts keyed by video ID using KV (primary) or D1 events (fallback).
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

const LEGACY_VIDEO_IDS = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'];

function toNumber(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

async function getKnownVideoIds(
	db: D1Database | undefined,
	kv: KVNamespace | undefined
): Promise<string[]> {
	const ids = new Set<string>(LEGACY_VIDEO_IDS);

	if (db) {
		try {
			const result = await db.prepare('SELECT id FROM videos').all<{ id: string }>();
			for (const row of result.results || []) {
				if (row.id) ids.add(row.id);
			}
		} catch (error) {
			console.error('Failed to load video IDs from D1:', error);
		}
	}

	if (kv) {
		try {
			let cursor: string | undefined;
			do {
				const listed = await kv.list({ prefix: 'views:', cursor, limit: 1000 });
				for (const key of listed.keys) {
					const id = key.name.replace(/^views:/, '');
					if (id) ids.add(id);
				}
				cursor = listed.list_complete ? undefined : listed.cursor;
			} while (cursor);
		} catch (error) {
			console.error('Failed to list view keys from KV:', error);
		}
	}

	return Array.from(ids);
}

export const GET: RequestHandler = async ({ platform }) => {
	const kv = platform?.env?.VIDEO_STATS;
	const db = platform?.env?.DB;

	try {
		const videoIds = await getKnownVideoIds(db, kv);
		const stats: Record<string, number> = Object.fromEntries(videoIds.map((id) => [id, 0]));

		if (kv) {
			const values = await Promise.all(videoIds.map((id) => kv.get(`views:${id}`)));
			videoIds.forEach((id, index) => {
				stats[id] = toNumber(values[index]);
			});

			return json({ stats, live: true });
		}

		if (db) {
			const result = await db
				.prepare(
					`SELECT json_extract(metadata, '$.videoId') as video_id, COUNT(*) as view_count
					 FROM user_events
					 WHERE event_type = 'video_play' AND metadata IS NOT NULL
					 GROUP BY json_extract(metadata, '$.videoId')`
				)
				.all<{ video_id: string | null; view_count: number }>();

			for (const row of result.results || []) {
				if (!row.video_id) continue;
				stats[row.video_id] = toNumber(row.view_count);
			}

			return json({ stats, live: false });
		}

		return json({ stats, live: false });
	} catch (error) {
		console.error('Video stats API error:', error);
		return json({ stats: {}, live: false, error: 'Failed to fetch video stats' }, { status: 500 });
	}
};
