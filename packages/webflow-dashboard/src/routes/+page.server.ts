import type { PageServerLoad } from './$types';
import type { Asset } from '$lib/types';
import { getAirtableClient } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ locals, platform }) => {
	let assets: Asset[] = [];
	let submissionsThisMonth = 0;

	if (locals.user?.email && platform?.env) {
		try {
			const airtable = getAirtableClient(platform.env);
			// Get all assets (no limit)
			assets = await airtable.getAssetsByEmail(locals.user.email);

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
			console.error('Failed to load dashboard data:', error);
		}
	}

	return {
		user: locals.user,
		assets,
		submissionsThisMonth
	};
};
