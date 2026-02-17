import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSeries, getSeries } from '$lib/server/db/series';
import { isAdminUser } from '$lib/server/admin';

interface CreateSeriesRequest {
	slug: string;
	title: string;
	description?: string;
}

/**
 * GET /api/v1/series
 * Lists all available series rows.
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	if (!locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	const rows = await getSeries(db);
	return json({ success: true, data: rows });
};

/**
 * POST /api/v1/series
 * Creates a series (admin-only).
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	if (!locals.user || !isAdminUser(locals.user, platform?.env)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	let payload: CreateSeriesRequest;
	try {
		payload = (await request.json()) as CreateSeriesRequest;
	} catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!payload.slug?.trim()) {
		return json({ success: false, error: 'slug is required' }, { status: 400 });
	}
	if (!payload.title?.trim()) {
		return json({ success: false, error: 'title is required' }, { status: 400 });
	}

	try {
		const created = await createSeries(db, {
			slug: payload.slug,
			title: payload.title,
			description: payload.description
		});

		return json({ success: true, data: created }, { status: 201 });
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
