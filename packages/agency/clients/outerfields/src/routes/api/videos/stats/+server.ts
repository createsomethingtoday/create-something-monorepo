/**
 * Video Stats API
 *
 * Returns view counts for all videos from Cloudflare KV
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Default view counts for demo (seeded data)
const DEFAULT_VIEWS: Record<string, number> = {
	v1: 1247,
	v2: 892,
	v3: 2156,
	v4: 634,
	v5: 1089
};

export const GET: RequestHandler = async ({ platform }) => {
	const kv = platform?.env?.VIDEO_STATS;

	// If KV is available, get real stats
	if (kv) {
		const stats: Record<string, number> = {};
		const videoIds = ['v1', 'v2', 'v3', 'v4', 'v5'];

		for (const id of videoIds) {
			const views = await kv.get(`views:${id}`);
			stats[id] = views ? parseInt(views, 10) : DEFAULT_VIEWS[id] || 0;
		}

		return json({ stats, live: true });
	}

	// Fallback for local dev - return seeded data with slight randomness
	const stats: Record<string, number> = {};
	for (const [id, baseViews] of Object.entries(DEFAULT_VIEWS)) {
		// Add small random variation for demo effect
		stats[id] = baseViews + Math.floor(Math.random() * 10);
	}

	return json({ stats, live: false });
};
