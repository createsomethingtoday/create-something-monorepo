import type { PageServerLoad } from './$types';
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

		// Fetch asset and related assets in parallel
		const [asset, relatedAssets] = await Promise.all([
			airtable.getAsset(params.id),
			airtable.getRelatedAssets(params.id, 6)
		]);

		if (!asset) {
			throw error(404, 'Asset not found');
		}

		return {
			user: locals.user,
			asset,
			relatedAssets
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to load asset:', err);
		throw error(500, 'Failed to load asset');
	}
};
