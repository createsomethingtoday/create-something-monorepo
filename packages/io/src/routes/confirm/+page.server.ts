import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { recordServerConversion, upsertWarmLead } from '@create-something/canon/analytics';
import { confirmNewsletterSubscription } from '$lib/server/newsletter-confirm';

export const load: PageServerLoad = async ({ url, platform, request, parent }) => {
	const token = url.searchParams.get('token');
	if (!token) throw error(400, 'Missing confirmation token');
	if (!platform?.env?.DB) throw error(500, 'Database not available');
	try {
		return await confirmNewsletterSubscription(token, request, platform.env,
			async () => (await parent()).user?.analytics_opt_out ?? false,
			{ recordServerConversion, upsertWarmLead });
	} catch (err) {
		console.error('Confirmation error:', err);
		throw error(500, 'Failed to process confirmation');
	}
};
