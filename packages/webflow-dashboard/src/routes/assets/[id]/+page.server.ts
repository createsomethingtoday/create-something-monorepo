import type { PageServerLoad } from './$types';
import type { Asset } from '$lib/types';
import { getAirtableClient } from '$lib/server/airtable';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const asset = await airtable.getAsset(params.id);

		if (!asset) {
			throw error(404, 'Asset not found');
		}

		// Verify ownership by checking if user has access to this asset
		// (In a real app, you'd verify the asset belongs to the user)

		return {
			user: locals.user,
			asset
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to load asset:', err);
		throw error(500, 'Failed to load asset');
	}
};
