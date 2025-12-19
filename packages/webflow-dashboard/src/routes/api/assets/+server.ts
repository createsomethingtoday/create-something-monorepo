import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ locals, platform }) => {
	// Check authentication
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	try {
		const airtable = getAirtableClient(platform?.env);
		const assets = await airtable.getAssetsByEmail(locals.user.email);

		return json({ assets });
	} catch (err) {
		console.error('Error fetching assets:', err);
		throw error(500, 'Failed to fetch assets');
	}
};
