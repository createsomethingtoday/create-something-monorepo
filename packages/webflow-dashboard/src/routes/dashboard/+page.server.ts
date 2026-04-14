import type { PageServerLoad } from './$types';
import { getAirtableClient, type Asset } from '$lib/server/airtable';
import { listAssetDrafts } from '$lib/server/drafts';
import type { AssetDraftRecord } from '$lib/drafts';

export const load: PageServerLoad = async ({ locals, platform, depends }) => {
	// Mark this load function as dependent on 'app:assets'
	// so invalidate('app:assets') will trigger a reload
	depends('app:assets');
	depends('app:drafts');

	// User is guaranteed to exist here due to hooks.server.ts protection
	let assets: Asset[] = [];
	let assetsError: string | null = null;
	let drafts: AssetDraftRecord[] = [];
	let draftsError: string | null = null;

	if (locals.user?.email && platform?.env) {
		try {
			const airtable = getAirtableClient(platform.env);
			assets = await airtable.getAssetsByEmail(locals.user.email);
		} catch (err) {
			console.error('Error fetching assets:', err);
			assetsError = 'We could not load your assets right now. Refresh to retry.';
		}

		try {
			drafts = await listAssetDrafts(platform.env.DB, locals.user.email);
		} catch (err) {
			console.error('Error fetching drafts:', err);
			draftsError = 'We could not load your saved drafts right now. Refresh to retry.';
		}
	}

	return {
		user: locals.user,
		assets,
		assetsError,
		drafts,
		draftsError
	};
};
