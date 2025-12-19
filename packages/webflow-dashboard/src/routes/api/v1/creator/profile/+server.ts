import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';
import { validateApiKeyFromRequest } from '$lib/server/apiKeyAuth';

export const GET: RequestHandler = async ({ request, platform }) => {
	// Validate API key with read:profile scope
	const auth = await validateApiKeyFromRequest(request, platform, 'read:profile');

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const creator = await airtable.getCreatorByEmail(auth.email);

		if (!creator) {
			throw error(404, 'Creator profile not found');
		}

		// Return public-safe fields only
		return json({
			creator: {
				id: creator.id,
				name: creator.name,
				avatarUrl: creator.avatarUrl,
				biography: creator.biography
				// Exclude: email, emails, legalName (private)
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to fetch creator profile:', err);
		throw error(500, 'Failed to fetch creator profile');
	}
};
