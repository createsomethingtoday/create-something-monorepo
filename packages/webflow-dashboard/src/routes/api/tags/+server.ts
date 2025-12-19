import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const tags = await airtable.getTags();

		return json({ tags });
	} catch (err) {
		console.error('Failed to fetch tags:', err);
		throw error(500, 'Failed to fetch tags');
	}
};
