import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import type { UserAnalytics } from '@create-something/components/analytics';

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { user } = await parent();

	if (!user) {
		redirect(302, '/login?redirect=/account');
	}

	// Fetch analytics if user hasn't opted out
	let analytics: UserAnalytics | null = null;

	if (!user.analytics_opt_out) {
		try {
			const response = await fetch('/api/user/analytics/aggregate?days=30');
			console.log('[Account] Analytics fetch response status:', response.status);
			if (response.ok) {
				analytics = await response.json();
				console.log('[Account] Analytics data:', JSON.stringify(analytics));
			} else {
				console.warn('[Account] Analytics fetch failed:', response.status, await response.text());
			}
		} catch (err) {
			console.warn('[Account] Failed to fetch user analytics:', err);
		}
	} else {
		console.log('[Account] User opted out of analytics');
	}

	return { user, analytics };
};
