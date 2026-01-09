/**
 * Video Engagement Tracking API
 *
 * Tracks playback events (watch, replay) and returns aggregated
 * engagement data for "Most Replayed" visualization.
 *
 * KV Schema:
 *   engagement:{videoId} = JSON array of 20 bucket counts
 *   Each bucket represents 5% of video duration
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BUCKET_COUNT = 20; // 20 buckets = 5% of video each

// Seed data for demo (simulates existing engagement)
const SEED_DATA: Record<string, number[]> = {
	'1': [30, 45, 60, 75, 90, 95, 85, 70, 55, 45, 40, 50, 65, 80, 70, 55, 45, 40, 35, 30],
	'2': [40, 50, 65, 80, 95, 90, 75, 60, 50, 45, 55, 70, 85, 90, 80, 65, 50, 40, 35, 30],
	'3': [35, 45, 55, 70, 85, 80, 75, 90, 95, 85, 70, 60, 55, 50, 45, 40, 35, 30, 25, 20],
	'4': [25, 35, 50, 65, 80, 95, 90, 85, 75, 65, 55, 50, 60, 75, 85, 70, 55, 45, 35, 30],
	'5': [30, 40, 55, 70, 80, 85, 95, 90, 80, 70, 60, 55, 50, 45, 40, 35, 30, 25, 20, 20]
};

/**
 * GET - Retrieve engagement data for a video
 */
export const GET: RequestHandler = async ({ params, platform }) => {
	const { id } = params;
	const kv = platform?.env?.VIDEO_STATS;

	if (!id) {
		return json({ error: 'Video ID required' }, { status: 400 });
	}

	// If KV available, get real data
	if (kv) {
		const key = `engagement:${id}`;
		const data = await kv.get(key);

		if (data) {
			const buckets = JSON.parse(data) as number[];
			// Normalize to 0-1 range for visualization
			const max = Math.max(...buckets, 1);
			const normalized = buckets.map((v) => v / max);

			return json({
				videoId: id,
				buckets: normalized,
				raw: buckets,
				live: true
			});
		}

		// No data yet - return seed data if available
		if (SEED_DATA[id]) {
			// Initialize KV with seed data
			await kv.put(key, JSON.stringify(SEED_DATA[id]));
			const max = Math.max(...SEED_DATA[id]);
			const normalized = SEED_DATA[id].map((v) => v / max);
			return json({
				videoId: id,
				buckets: normalized,
				raw: SEED_DATA[id],
				live: true
			});
		}

		// No data at all - return empty
		return json({
			videoId: id,
			buckets: new Array(BUCKET_COUNT).fill(0),
			raw: new Array(BUCKET_COUNT).fill(0),
			live: true
		});
	}

	// Fallback for local dev - return seed data
	const seed = SEED_DATA[id] || new Array(BUCKET_COUNT).fill(0);
	const max = Math.max(...seed, 1);
	const normalized = seed.map((v) => v / max);

	return json({
		videoId: id,
		buckets: normalized,
		raw: seed,
		live: false
	});
};

/**
 * POST - Track an engagement event
 *
 * Body: { bucket: number, type: 'watch' | 'replay' }
 *
 * - bucket: 0-19 (which 5% segment of the video)
 * - type: 'watch' for normal playback, 'replay' for seeking backwards
 *
 * Replay events count double since they indicate high interest.
 */
export const POST: RequestHandler = async ({ params, request, platform }) => {
	const { id } = params;
	const kv = platform?.env?.VIDEO_STATS;

	if (!id) {
		return json({ error: 'Video ID required' }, { status: 400 });
	}

	let body: { bucket: number; type: 'watch' | 'replay' };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { bucket, type } = body;

	if (typeof bucket !== 'number' || bucket < 0 || bucket >= BUCKET_COUNT) {
		return json({ error: `Bucket must be 0-${BUCKET_COUNT - 1}` }, { status: 400 });
	}

	if (type !== 'watch' && type !== 'replay') {
		return json({ error: 'Type must be "watch" or "replay"' }, { status: 400 });
	}

	// Replay events count more (indicates high interest)
	const increment = type === 'replay' ? 2 : 1;

	if (kv) {
		const key = `engagement:${id}`;
		const existing = await kv.get(key);
		let buckets: number[];

		if (existing) {
			buckets = JSON.parse(existing);
		} else {
			// Initialize with seed data or zeros
			buckets = SEED_DATA[id] ? [...SEED_DATA[id]] : new Array(BUCKET_COUNT).fill(0);
		}

		// Increment the bucket
		buckets[bucket] = (buckets[bucket] || 0) + increment;

		// Store updated data
		await kv.put(key, JSON.stringify(buckets));

		// Return normalized data
		const max = Math.max(...buckets, 1);
		const normalized = buckets.map((v) => v / max);

		return json({
			videoId: id,
			bucket,
			type,
			buckets: normalized,
			live: true
		});
	}

	// Fallback for local dev - just acknowledge
	return json({
		videoId: id,
		bucket,
		type,
		live: false
	});
};
