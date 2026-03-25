import type { PageServerLoad } from './$types';
import { getAirtableClient, type Asset } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ locals, platform, depends }) => {
	// Mark this load function as dependent on 'app:assets'
	// so invalidate('app:assets') will trigger a reload
	depends('app:assets');

	// User is guaranteed to exist here due to hooks.server.ts protection
	let assets: Asset[] = [];
	let assetsError: string | null = null;

	if (locals.user?.email && platform?.env) {
		try {
			const airtable = getAirtableClient(platform.env);
			assets = await airtable.getAssetsByEmail(locals.user.email);
		} catch (err) {
			console.error('Error fetching assets:', err);
			assetsError = 'We could not load your assets right now. Refresh to retry.';
		}
	}

	return {
		user: locals.user,
		assets,
		assetsError
	};
};
