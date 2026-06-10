import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { invalidateAssetsCache } from '$lib/server/assets-cache';

// DELETE - Drop the current user's cached asset list (used by manual "Refresh assets")
export const DELETE: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	await invalidateAssetsCache(platform.env.SESSIONS, locals.user.email);

	return json({ success: true });
};
