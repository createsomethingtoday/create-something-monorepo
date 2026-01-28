import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import type { UserAnalytics } from '@create-something/canon/analytics';

export const load: PageServerLoad = async ({ parent, cookies }) => {
	const { user } = await parent();

	if (!user) {
		redirect(302, '/login?redirect=/account');
	}

	// Fetch analytics from .io aggregator if user hasn't opted out
	let analytics: UserAnalytics | null = null;

	if (!user.analytics_opt_out) {
		try {
			const accessToken = cookies.get('cs_access_token');
			const response = await fetch('https://createsomething.io/api/user/analytics/aggregate?days=30', {
				headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
			});
			if (response.ok) {
				analytics = await response.json();
			}
		} catch (err) {
			console.warn('Failed to fetch user analytics:', err);
		}
	}

	return { user, analytics };
};
