import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

/**
 * POST: Check if asset name is unique (excluding current asset if specified)
 *
 * Body: { name: string, excludeId?: string }
 * Returns: { available: boolean, existingId?: string }
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const body = (await request.json()) as { name?: string; excludeId?: string };

	if (!body.name || typeof body.name !== 'string') {
		throw error(400, 'Missing required parameter: name');
	}

	const name = body.name.trim();
	if (!name) {
		throw error(400, 'Name cannot be empty');
	}

	const airtable = getAirtableClient(platform.env);

	try {
		const result = await airtable.checkAssetNameUniqueness(name, body.excludeId);

		return json({
			available: result.unique,
			existingId: result.existingId
		});
	} catch (err) {
		console.error('Error checking asset name:', err);
		throw error(500, 'Failed to check asset name');
	}
};
