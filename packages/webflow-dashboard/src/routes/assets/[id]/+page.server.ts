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

	// Verify ownership first
	const isOwner = await airtable.verifyAssetOwnership(params.id, locals.user.email);
	if (!isOwner) {
		throw error(403, 'You do not have permission to view this asset');
	}

	// Fetch asset details
	const asset = await airtable.getAsset(params.id);
	if (!asset) {
		throw error(404, 'Asset not found');
	}

	return {
		asset,
		user: locals.user
	};
};
