import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCategorySummaries, renameCategory } from '$lib/server/db/videos';
import { isAdminUser } from '$lib/server/auth';
import { getDBFromPlatform } from '$lib/server/d1-compat';

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!isAdminUser(locals.user)) {
		return json({ success: false, error: 'Not authorized' }, { status: 403 });
	}

	const db = getDBFromPlatform(platform);

	try {
		const categories = await getCategorySummaries(db);
		return json({ success: true, data: categories });
	} catch (error) {
		console.error('Error fetching categories:', error);
		return json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ request, platform, locals }) => {
	if (!isAdminUser(locals.user)) {
		return json({ success: false, error: 'Not authorized' }, { status: 403 });
	}

	const db = getDBFromPlatform(platform);

	try {
		const body = await request.json();
		const from = String(body.from || '').trim();
		const to = String(body.to || '').trim();

		if (!from || !to) {
			return json({ success: false, error: 'from and to are required' }, { status: 400 });
		}
		if (from === to) {
			return json({ success: false, error: 'Category names are the same' }, { status: 400 });
		}

		const updated = await renameCategory(db, from, to);
		const categories = await getCategorySummaries(db);

		return json({
			success: true,
			data: {
				updated,
				categories
			}
		});
	} catch (error) {
		console.error('Error renaming category:', error);
		return json({ success: false, error: 'Failed to rename category' }, { status: 500 });
	}
};
