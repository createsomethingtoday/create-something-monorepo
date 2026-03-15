import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdminUser } from '$lib/server/admin';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getSeriesByIdentifier, updateSeriesHomeConfig, type SeriesVisibility } from '$lib/server/db/series';
import { resolveRuntimeEnv } from '$lib/server/env';

function normalizeVisibility(value: unknown): SeriesVisibility | null {
	if (value === 'draft' || value === 'published' || value === 'archived') return value;
	return null;
}

function safeJsonStringifyArray(value: unknown): string | null {
	if (!Array.isArray(value)) return null;
	const filtered = value.filter((entry) => typeof entry === 'string') as string[];
	return JSON.stringify(filtered);
}

/**
 * GET /api/v1/admin/series/:id
 */
export const GET: RequestHandler = async ({ locals, params, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	if (!locals.user) return json({ success: false, error: 'Authentication required' }, { status: 401 });
	if (!isAdminUser(locals.user, runtimeEnv)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	const identifier = params.id;
	if (!identifier) return json({ success: false, error: 'Series id is required' }, { status: 400 });

	const series = await getSeriesByIdentifier(db, identifier);
	if (!series) return json({ success: false, error: 'Series not found' }, { status: 404 });

	return json({ success: true, data: series });
};

/**
 * PATCH /api/v1/admin/series/:id
 */
export const PATCH: RequestHandler = async ({ locals, params, request, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	if (!locals.user) return json({ success: false, error: 'Authentication required' }, { status: 401 });
	if (!isAdminUser(locals.user, runtimeEnv)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	const seriesId = params.id;
	if (!seriesId) return json({ success: false, error: 'Series id is required' }, { status: 400 });

	const existing = await getSeriesByIdentifier(db, seriesId);
	if (!existing) return json({ success: false, error: 'Series not found' }, { status: 404 });

	let payload: Record<string, unknown>;
	try {
		payload = (await request.json()) as Record<string, unknown>;
	} catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	const title = typeof payload.title === 'string' ? payload.title.trim() : undefined;
	const description = typeof payload.description === 'string' ? payload.description : undefined;
	const visibility = normalizeVisibility(payload.visibility);

	const sortOrderRaw = payload.sort_order;
	const sortOrder =
		typeof sortOrderRaw === 'number' && Number.isFinite(sortOrderRaw) ? Math.floor(sortOrderRaw) : undefined;

	const homeFiltersRaw =
		payload.home_filters !== undefined ? safeJsonStringifyArray(payload.home_filters) : undefined;
	if (payload.home_filters !== undefined && homeFiltersRaw === null) {
		return json({ success: false, error: 'home_filters must be an array of strings' }, { status: 400 });
	}
	const homeFilters = homeFiltersRaw === null ? undefined : homeFiltersRaw;

	const updated = await updateSeriesHomeConfig(db, existing.id, {
		...(title ? { title } : {}),
		...(description !== undefined ? { description } : {}),
		...(visibility ? { visibility } : {}),
		...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
		...(homeFilters !== undefined ? { home_filters: homeFilters } : {})
	});

	if (!updated) return json({ success: false, error: 'Series not found' }, { status: 404 });
	return json({ success: true, data: updated });
};

/**
 * DELETE /api/v1/admin/series/:id
 * Soft-archives the series (does not delete).
 */
export const DELETE: RequestHandler = async ({ locals, params, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	if (!locals.user) return json({ success: false, error: 'Authentication required' }, { status: 401 });
	if (!isAdminUser(locals.user, runtimeEnv)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	const seriesId = params.id;
	if (!seriesId) return json({ success: false, error: 'Series id is required' }, { status: 400 });

	const updated = await updateSeriesHomeConfig(db, seriesId, { visibility: 'archived' });
	if (!updated) return json({ success: false, error: 'Series not found' }, { status: 404 });

	return json({ success: true, data: updated });
};
