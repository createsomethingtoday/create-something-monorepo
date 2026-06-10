import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	// Check authentication
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const airtable = getAirtableClient(platform.env);

	// Single Airtable call: fetch the record once, derive both ownership and the asset from it.
	const { asset, isOwner } = await airtable.getAssetForOwner(params.id, locals.user.email);
	if (!asset) {
		throw error(404, 'Asset not found');
	}
	if (!isOwner) {
		throw error(403, 'You do not have permission to view this asset');
	}

	return {
		asset,
		user: locals.user
	};
};
