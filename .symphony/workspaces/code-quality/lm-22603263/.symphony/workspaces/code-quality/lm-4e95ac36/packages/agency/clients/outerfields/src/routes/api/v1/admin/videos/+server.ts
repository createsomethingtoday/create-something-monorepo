import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdminUser } from '$lib/server/admin';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { listAdminVideos, type VideoIngestStatus, type VideoVisibility } from '$lib/server/db/videos';
import { resolveRuntimeEnv } from '$lib/server/env';

function normalizeVisibility(value: string | null): VideoVisibility | 'all' | undefined {
	if (!value) return undefined;
	if (value === 'all') return 'all';
	if (value === 'draft' || value === 'published' || value === 'archived') return value;
	return undefined;
}

function normalizeIngestStatus(value: string | null): VideoIngestStatus | 'all' | undefined {
	if (!value) return undefined;
	if (value === 'all') return 'all';
	if (value === 'pending_upload' || value === 'processing' || value === 'ready' || value === 'failed') return value;
	return undefined;
}

/**
 * GET /api/v1/admin/videos
 * Admin-only listing endpoint with basic filters.
 */
export const GET: RequestHandler = async ({ locals, url, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	if (!locals.user) return json({ success: false, error: 'Authentication required' }, { status: 401 });
	if (!isAdminUser(locals.user, runtimeEnv)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	const q = url.searchParams.get('q') || undefined;
	const visibility = normalizeVisibility(url.searchParams.get('visibility'));
	const ingestStatus = normalizeIngestStatus(url.searchParams.get('ingest_status'));
	const seriesId = url.searchParams.get('series_id') || undefined;
	const tier = (url.searchParams.get('tier') as 'free' | 'preview' | 'gated' | null) || undefined;
	const featured =
		url.searchParams.get('featured') === 'true'
			? 'true'
			: url.searchParams.get('featured') === 'false'
				? 'false'
				: undefined;

	const limitParam = url.searchParams.get('limit');
	const offsetParam = url.searchParams.get('offset');
	const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
	const offset = offsetParam ? Number.parseInt(offsetParam, 10) : undefined;

	const result = await listAdminVideos(db, {
		q,
		visibility,
		ingestStatus,
		seriesId,
		tier,
		featured,
		limit,
		offset
	});

	return json({
		success: true,
		data: result
	});
};
