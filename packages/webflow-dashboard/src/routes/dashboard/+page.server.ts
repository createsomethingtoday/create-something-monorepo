import type { PageServerLoad } from './$types';
import { getAirtableClient, type Asset } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ locals, platform }) => {
	// User is guaranteed to exist here due to hooks.server.ts protection
	let assets: Asset[] = [];

	if (locals.user?.email && platform?.env) {
		try {
			const airtable = getAirtableClient(platform.env);
			assets = await airtable.getAssetsByEmail(locals.user.email);
		} catch (err) {
			console.error('Error fetching assets:', err);
			// Continue with empty assets rather than failing the page load
		}
	}

	return {
		user: locals.user,
		assets
	};
};
