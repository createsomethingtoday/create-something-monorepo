import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdminUser } from '$lib/server/admin';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { createSeries, listAdminSeries, updateSeriesHomeConfig } from '$lib/server/db/series';
import { resolveRuntimeEnv } from '$lib/server/env';

interface CreateSeriesRequest {
	slug: string;
	title: string;
	description?: string;
}

function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}

function parseSortOrder(value: unknown): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	return Math.floor(value);
}

/**
 * GET /api/v1/admin/series
 * Lists all series (admin-only).
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	if (!locals.user) return json({ success: false, error: 'Authentication required' }, { status: 401 });
	if (!isAdminUser(locals.user, runtimeEnv)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	const rows = await listAdminSeries(db);
	return json({ success: true, data: rows });
};

/**
 * POST /api/v1/admin/series
 * Creates a new series (admin-only).
 */
export const POST: RequestHandler = async ({ locals, request, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));
	const db = getDBFromPlatform(platform);

	if (!locals.user) return json({ success: false, error: 'Authentication required' }, { status: 401 });
	if (!isAdminUser(locals.user, runtimeEnv)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	let payload: CreateSeriesRequest & { sort_order?: unknown };
	try {
		payload = (await request.json()) as CreateSeriesRequest & { sort_order?: unknown };
	} catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!payload.slug?.trim()) return json({ success: false, error: 'slug is required' }, { status: 400 });
	if (!payload.title?.trim()) return json({ success: false, error: 'title is required' }, { status: 400 });

	try {
		const created = await createSeries(db, {
			slug: payload.slug,
			title: payload.title,
			description: payload.description
		});

		// Default new series to the end of the list for safety.
		const all = await listAdminSeries(db);
		const maxOrder = all.reduce((acc, entry) => Math.max(acc, entry.sort_order ?? 0), 0);
		const desiredSortOrder = parseSortOrder(payload.sort_order) ?? maxOrder + 10;

		const updated = await updateSeriesHomeConfig(db, created.id, {
			sort_order: desiredSortOrder,
			home_filters: created.home_filters || '["series"]',
			visibility: created.visibility || 'published'
		});

		return json({ success: true, data: updated ?? created, createdAt: nowSeconds() }, { status: 201 });
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to create series'
			},
			{ status: 500 }
		);
	}
};
