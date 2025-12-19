import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

// GET /api/assets - List all assets for authenticated user
export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const assets = await airtable.getAssetsByEmail(locals.user.email);

		return json({ assets });
	} catch (err) {
		console.error('Failed to fetch assets:', err);
		throw error(500, 'Failed to fetch assets');
	}
};
