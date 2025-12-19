import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	// Require authentication
	if (!locals.user?.email) {
		throw redirect(302, '/login');
	}

	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const airtable = getAirtableClient(platform.env);

	// Get the asset
	const asset = await airtable.getAsset(params.id);

	if (!asset) {
		throw error(404, 'Asset not found');
	}

	// Verify ownership
	const isOwner = await airtable.verifyAssetOwnership(params.id, locals.user.email);

	if (!isOwner) {
		throw error(403, 'You do not have access to this asset');
	}

	// Get related assets
	const relatedAssets = await airtable.getRelatedAssets(params.id, 6);

	return {
		asset,
		relatedAssets,
		user: locals.user
	};
};
