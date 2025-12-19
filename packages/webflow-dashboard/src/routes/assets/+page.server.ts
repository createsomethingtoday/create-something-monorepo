import type { PageServerLoad } from './$types';
import type { Asset } from '$lib/types';
import { getAirtableClient } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ locals, platform }) => {
	let assets: Asset[] = [];

	if (locals.user?.email && platform?.env) {
		try {
			const airtable = getAirtableClient(platform.env);
			assets = await airtable.getAssetsByEmail(locals.user.email);
		} catch (error) {
			console.error('Failed to load assets:', error);
		}
	}

	return {
		user: locals.user,
		assets
	};
};
