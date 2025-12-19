import type { PageServerLoad } from './$types';
import type { Asset } from '$lib/types';
import { getAirtableClient } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ locals, platform }) => {
	let assets: Asset[] = [];
	let submissionsThisMonth = 0;

	// Debug: Log what we have access to
	console.log('[Dashboard] Loading with:', {
		hasUser: !!locals.user,
		userEmail: locals.user?.email,
		hasPlatform: !!platform,
		hasEnv: !!platform?.env,
		hasAirtableKey: !!platform?.env?.AIRTABLE_API_KEY,
		hasAirtableBase: !!platform?.env?.AIRTABLE_BASE_ID
	});

	if (locals.user?.email && platform?.env) {
		try {
			const airtable = getAirtableClient(platform.env);
			console.log('[Dashboard] Airtable client created, fetching assets for:', locals.user.email);

			// Get all assets (no limit)
			assets = await airtable.getAssetsByEmail(locals.user.email);
			console.log('[Dashboard] Fetched assets:', assets.length, 'items');

			if (assets.length > 0) {
				console.log('[Dashboard] First asset:', JSON.stringify(assets[0], null, 2));
			}

			// Calculate submissions this month
			const now = new Date();
			const currentYear = now.getFullYear();
			const currentMonth = now.getMonth();

			submissionsThisMonth = assets.filter(asset => {
				if (!asset.submittedDate) return false;
				const submittedDate = new Date(asset.submittedDate);
				return (
					submittedDate.getFullYear() === currentYear &&
					submittedDate.getMonth() === currentMonth
				);
			}).length;
		} catch (error) {
			console.error('[Dashboard] Failed to load dashboard data:', error);
			console.error('[Dashboard] Error stack:', error instanceof Error ? error.stack : 'No stack');
		}
	} else {
		console.log('[Dashboard] Skipping asset fetch - missing user or platform env');
	}

	return {
		user: locals.user,
		assets,
		submissionsThisMonth
	};
};
