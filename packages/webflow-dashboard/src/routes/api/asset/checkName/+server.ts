import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	const name = url.searchParams.get('name');
	const excludeId = url.searchParams.get('excludeId');

	if (!name || name.trim().length === 0) {
		throw error(400, 'Name parameter is required');
	}

	if (name.trim().length > 100) {
		throw error(400, 'Name too long (max 100 characters)');
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const result = await airtable.checkAssetNameUniqueness(name, excludeId || undefined);

		return json(result);
	} catch (err) {
		console.error('Failed to check name uniqueness:', err);
		throw error(500, 'Failed to check name uniqueness');
	}
};
