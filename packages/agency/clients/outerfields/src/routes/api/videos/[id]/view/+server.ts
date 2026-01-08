/**
 * Video View Increment API
 *
 * Increments view count for a video in Cloudflare KV
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Default starting views
const DEFAULT_VIEWS: Record<string, number> = {
	v1: 1247,
	v2: 892,
	v3: 2156,
	v4: 634,
	v5: 1089
};

export const POST: RequestHandler = async ({ params, platform }) => {
	const { id } = params;
	const kv = platform?.env?.VIDEO_STATS;

	if (!id) {
		return json({ error: 'Video ID required' }, { status: 400 });
	}

	// If KV is available, increment real counter
	if (kv) {
		const key = `views:${id}`;
		const current = await kv.get(key);
		const currentViews = current ? parseInt(current, 10) : DEFAULT_VIEWS[id] || 0;
		const newViews = currentViews + 1;

		await kv.put(key, newViews.toString());

		return json({ id, views: newViews, live: true });
	}

	// Fallback for local dev
	const views = (DEFAULT_VIEWS[id] || 0) + Math.floor(Math.random() * 20) + 1;

	return json({ id, views, live: false });
};
