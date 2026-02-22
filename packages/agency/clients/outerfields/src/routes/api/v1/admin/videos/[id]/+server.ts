import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdminUser } from '$lib/server/admin';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getAdminVideoById, type VideoPlaybackPolicy, type VideoVisibility } from '$lib/server/db/videos';
import { resolveRuntimeEnv } from '$lib/server/env';
import { hasPlayableVideoSource } from '$lib/server/video-availability';

function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}

function normalizeVisibility(value: unknown): VideoVisibility | null {
	if (value === 'draft' || value === 'published' || value === 'archived') return value;
	return null;
}

function normalizeTier(value: unknown): 'free' | 'preview' | 'gated' | null {
	if (value === 'free' || value === 'preview' || value === 'gated') return value;
	return null;
}

function normalizePlaybackPolicy(value: unknown): VideoPlaybackPolicy | null {
	if (value === 'private' || value === 'public') return value;
	return null;
}

/**
 * GET /api/v1/admin/videos/:id
 */
export const GET: RequestHandler = async ({ locals, params, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	if (!locals.user) return json({ success: false, error: 'Authentication required' }, { status: 401 });
	if (!isAdminUser(locals.user, runtimeEnv)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	const videoId = params.id;
	if (!videoId) return json({ success: false, error: 'Video id is required' }, { status: 400 });

	const video = await getAdminVideoById(db, videoId);
	if (!video) return json({ success: false, error: 'Video not found' }, { status: 404 });

	return json({ success: true, data: video });
};

/**
 * PATCH /api/v1/admin/videos/:id
 */
export const PATCH: RequestHandler = async ({ locals, params, request, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	if (!locals.user) return json({ success: false, error: 'Authentication required' }, { status: 401 });
	if (!isAdminUser(locals.user, runtimeEnv)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	const videoId = params.id;
	if (!videoId) return json({ success: false, error: 'Video id is required' }, { status: 400 });

	const existing = await getAdminVideoById(db, videoId);
	if (!existing) return json({ success: false, error: 'Video not found' }, { status: 404 });

	let payload: Record<string, unknown>;
	try {
		payload = (await request.json()) as Record<string, unknown>;
	} catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	const visibility = payload.visibility !== undefined ? normalizeVisibility(payload.visibility) : null;
	if (payload.visibility !== undefined && !visibility) {
		return json({ success: false, error: 'Invalid visibility value' }, { status: 400 });
	}

	const tier = payload.tier !== undefined ? normalizeTier(payload.tier) : null;
	if (payload.tier !== undefined && !tier) {
		return json({ success: false, error: 'Invalid tier value' }, { status: 400 });
	}

	const playbackPolicy =
		payload.playback_policy !== undefined ? normalizePlaybackPolicy(payload.playback_policy) : null;
	if (payload.playback_policy !== undefined && !playbackPolicy) {
		return json({ success: false, error: 'Invalid playback_policy value' }, { status: 400 });
	}

	const title = typeof payload.title === 'string' ? payload.title.trim() : undefined;
	const description = typeof payload.description === 'string' ? payload.description : undefined;

	const episodeNumberRaw = payload.episode_number;
	const episodeNumber =
		episodeNumberRaw === null
			? null
			: typeof episodeNumberRaw === 'number' && Number.isFinite(episodeNumberRaw)
				? Math.floor(episodeNumberRaw)
				: undefined;
	if (payload.episode_number !== undefined && episodeNumber === undefined) {
		return json({ success: false, error: 'Invalid episode_number value' }, { status: 400 });
	}

	const featuredRaw = payload.is_featured;
	const isFeatured =
		featuredRaw === undefined
			? undefined
			: featuredRaw === true || featuredRaw === 1
				? 1
				: featuredRaw === false || featuredRaw === 0
					? 0
					: undefined;
	if (featuredRaw !== undefined && isFeatured === undefined) {
		return json({ success: false, error: 'Invalid is_featured value' }, { status: 400 });
	}

	const featuredOrderRaw = payload.featured_order;
	const featuredOrder =
		typeof featuredOrderRaw === 'number' && Number.isFinite(featuredOrderRaw)
			? Math.max(0, Math.floor(featuredOrderRaw))
			: featuredOrderRaw === undefined
				? undefined
				: null;
	if (featuredOrderRaw !== undefined && featuredOrder === null) {
		return json({ success: false, error: 'Invalid featured_order value' }, { status: 400 });
	}

	const seriesId = typeof payload.series_id === 'string' ? payload.series_id.trim() : undefined;
	const thumbnailPath = typeof payload.thumbnail_path === 'string' ? payload.thumbnail_path.trim() : undefined;
	const assetPath = typeof payload.asset_path === 'string' ? payload.asset_path.trim() : undefined;

	if (visibility === 'published') {
		if (existing.ingest_status !== 'ready') {
			return json(
				{
					success: false,
					error: 'Cannot publish a video until ingest is ready',
					ingestStatus: existing.ingest_status
				},
				{ status: 400 }
			);
		}

		const nextAssetPath = assetPath !== undefined ? assetPath : existing.asset_path;
		const hasSource = hasPlayableVideoSource({
			stream_uid: existing.stream_uid,
			asset_path: nextAssetPath
		});
		if (!hasSource) {
			return json(
				{
					success: false,
					error: 'Cannot publish a video without a playable source (stream_uid or asset_path)'
				},
				{ status: 400 }
			);
		}
	}

	let nextCategory: string | undefined;
	if (seriesId !== undefined && seriesId.length > 0) {
		const seriesRow = await db
			.prepare('SELECT slug FROM series WHERE id = ? LIMIT 1')
			.bind(seriesId)
			.first<{ slug: string }>();
		if (!seriesRow?.slug) {
			return json({ success: false, error: 'Series not found' }, { status: 404 });
		}
		nextCategory = seriesRow.slug;
	}

	const nextVisibility = visibility ?? existing.visibility;
	if (isFeatured === 1 && nextVisibility !== 'published') {
		return json({ success: false, error: 'Only published videos can be featured' }, { status: 400 });
	}

	const sets: string[] = [];
	const binds: Array<string | number | null> = [];

	if (title !== undefined && title.length > 0) {
		sets.push('title = ?');
		binds.push(title);
	}
	if (description !== undefined) {
		sets.push('description = ?');
		binds.push(description.trim() || null);
	}
	if (tier) {
		sets.push('tier = ?');
		binds.push(tier);
	}
	if (seriesId !== undefined) {
		sets.push('series_id = ?');
		binds.push(seriesId || null);
		if (nextCategory) {
			sets.push('category = ?');
			binds.push(nextCategory);
		}
	}
	if (episodeNumber !== undefined) {
		sets.push('episode_number = ?');
		binds.push(episodeNumber);
	}
	if (thumbnailPath !== undefined) {
		sets.push('thumbnail_path = ?');
		binds.push(thumbnailPath);
	}
	if (assetPath !== undefined) {
		sets.push('asset_path = ?');
		binds.push(assetPath);
	}
	if (playbackPolicy) {
		sets.push('playback_policy = ?');
		binds.push(playbackPolicy);
	}
	if (visibility) {
		sets.push('visibility = ?');
		binds.push(visibility);
	}
	if (isFeatured !== undefined) {
		sets.push('is_featured = ?');
		binds.push(isFeatured);
		if (isFeatured === 0) {
			sets.push('featured_order = 0');
		}
	}
	if (featuredOrder !== undefined) {
		sets.push('featured_order = ?');
		binds.push(featuredOrder);
	}

	if (sets.length === 0) {
		return json({ success: true, data: existing });
	}

	sets.push('updated_at = ?');
	binds.push(nowSeconds());

	const statement = `UPDATE videos SET ${sets.join(', ')} WHERE id = ?`;
	binds.push(existing.id);

	await db.prepare(statement).bind(...binds).run();

	const updated = await getAdminVideoById(db, existing.id);
	return json({ success: true, data: updated ?? existing });
};

/**
 * DELETE /api/v1/admin/videos/:id
 * Soft-archives the video (does not delete from Stream).
 */
export const DELETE: RequestHandler = async ({ locals, params, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	if (!locals.user) return json({ success: false, error: 'Authentication required' }, { status: 401 });
	if (!isAdminUser(locals.user, runtimeEnv)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	const videoId = params.id;
	if (!videoId) return json({ success: false, error: 'Video id is required' }, { status: 400 });

	const existing = await getAdminVideoById(db, videoId);
	if (!existing) return json({ success: false, error: 'Video not found' }, { status: 404 });

	const now = nowSeconds();
	await db.prepare(
		`UPDATE videos
		 SET visibility = 'archived',
			 is_featured = 0,
			 featured_order = 0,
			 updated_at = ?
		 WHERE id = ?`
	)
		.bind(now, existing.id)
		.run();

	const updated = await getAdminVideoById(db, existing.id);
	return json({ success: true, data: updated ?? existing });
};
