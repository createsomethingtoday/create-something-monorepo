/**
 * Video Engagement Tracking API
 *
 * Tracks playback bucket interactions and returns normalized engagement data.
 * KV is primary storage. D1 user_events is used as a fallback when KV is unavailable.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { D1Database } from '@cloudflare/workers-types';

const BUCKET_COUNT = 20; // 20 buckets = 5% of video each

function emptyBuckets(): number[] {
	return new Array(BUCKET_COUNT).fill(0);
}

function normalizeBuckets(raw: number[]): number[] {
	const max = Math.max(...raw, 1);
	return raw.map((value) => value / max);
}

function toNumber(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

function toArrayOfNumbers(value: unknown): number[] {
	if (!Array.isArray(value)) return emptyBuckets();
	const parsed = value.map((item) => Math.max(0, Math.floor(toNumber(item))));
	if (parsed.length < BUCKET_COUNT) {
		return [...parsed, ...new Array(BUCKET_COUNT - parsed.length).fill(0)];
	}
	return parsed.slice(0, BUCKET_COUNT);
}

function buildEventId(): string {
	return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function getBucketsFromD1(db: D1Database, videoId: string): Promise<number[]> {
	const raw = emptyBuckets();
	const result = await db
		.prepare(
			`SELECT
				json_extract(metadata, '$.bucket') as bucket_index,
				SUM(CASE WHEN json_extract(metadata, '$.engagementType') = 'replay' THEN 2 ELSE 1 END) as total
			 FROM user_events
			 WHERE event_type = 'video_pause'
			   AND json_extract(metadata, '$.videoId') = ?
			 GROUP BY json_extract(metadata, '$.bucket')`
		)
		.bind(videoId)
		.all<{ bucket_index: number | string | null; total: number | string | null }>();

	for (const row of result.results || []) {
		const bucket = Math.floor(toNumber(row.bucket_index));
		if (bucket < 0 || bucket >= BUCKET_COUNT) continue;
		raw[bucket] = toNumber(row.total);
	}

	return raw;
}

function parseBody(value: unknown): { bucket: number; type: 'watch' | 'replay' } | null {
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	const bucket = toNumber(record.bucket);
	const type = record.type;

	if (!Number.isInteger(bucket) || bucket < 0 || bucket >= BUCKET_COUNT) return null;
	if (type !== 'watch' && type !== 'replay') return null;

	return { bucket, type };
}

/**
 * GET - Retrieve engagement data for a video.
 */
export const GET: RequestHandler = async ({ params, platform }) => {
	const { id } = params;
	const kv = platform?.env?.VIDEO_STATS;
	const db = platform?.env?.DB;

	if (!id) {
		return json({ error: 'Video ID required' }, { status: 400 });
	}

	try {
		if (kv) {
			const data = await kv.get(`engagement:${id}`);
			const raw = data ? toArrayOfNumbers(JSON.parse(data)) : emptyBuckets();
			return json({
				videoId: id,
				buckets: normalizeBuckets(raw),
				raw,
				live: true
			});
		}

		if (db) {
			const raw = await getBucketsFromD1(db, id);
			return json({
				videoId: id,
				buckets: normalizeBuckets(raw),
				raw,
				live: false
			});
		}

		const raw = emptyBuckets();
		return json({
			videoId: id,
			buckets: normalizeBuckets(raw),
			raw,
			live: false
		});
	} catch (error) {
		console.error('Failed to fetch engagement data:', error);
		return json({ error: 'Failed to fetch engagement data' }, { status: 500 });
	}
};

/**
 * POST - Track an engagement event.
 *
 * Body: { bucket: number, type: 'watch' | 'replay' }
 */
export const POST: RequestHandler = async ({ params, request, platform }) => {
	const { id } = params;
	const kv = platform?.env?.VIDEO_STATS;
	const db = platform?.env?.DB;

	if (!id) {
		return json({ error: 'Video ID required' }, { status: 400 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const parsed = parseBody(body);
	if (!parsed) {
		return json({ error: `Body must include bucket (0-${BUCKET_COUNT - 1}) and type` }, { status: 400 });
	}

	const { bucket, type } = parsed;
	const increment = type === 'replay' ? 2 : 1;

	try {
		if (kv) {
			const key = `engagement:${id}`;
			const existing = await kv.get(key);
			const raw = existing ? toArrayOfNumbers(JSON.parse(existing)) : emptyBuckets();

			raw[bucket] = (raw[bucket] || 0) + increment;
			await kv.put(key, JSON.stringify(raw));

			return json({
				videoId: id,
				bucket,
				type,
				buckets: normalizeBuckets(raw),
				raw,
				live: true
			});
		}

		if (db) {
			const now = Date.now();
			const eventId = buildEventId();
			const sessionId = `engage_${id}_${now}`;

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
					'video_pause',
					null,
					sessionId,
					`/watch/${id}`,
					'video-player',
					'engagement_bucket',
					JSON.stringify({ videoId: id, bucket, engagementType: type }),
					null,
					null,
					null,
					null,
					null,
					now
				)
				.run();

			const raw = await getBucketsFromD1(db, id);
			return json({
				videoId: id,
				bucket,
				type,
				buckets: normalizeBuckets(raw),
				raw,
				live: false
			});
		}

		return json({
			videoId: id,
			bucket,
			type,
			buckets: normalizeBuckets(emptyBuckets()),
			raw: emptyBuckets(),
			live: false
		});
	} catch (error) {
		console.error('Failed to track engagement:', error);
		return json({ error: 'Failed to track engagement' }, { status: 500 });
	}
};
