import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { applyTemplateViews } from '$lib/server/template-views';

export const GET: RequestHandler = async ({ locals, platform }) => {
	// Check authentication
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	try {
		const airtable = getAirtableClient(platform?.env);
		const assets = await applyTemplateViews(
			platform?.env,
			await airtable.getAssetsByEmail(locals.user.email),
			{ waitUntil: (p) => platform?.context?.waitUntil(p) }
		);

		return json({ assets });
	} catch (err) {
		console.error('Error fetching assets:', err);
		throw error(500, 'Failed to fetch assets');
	}
};
