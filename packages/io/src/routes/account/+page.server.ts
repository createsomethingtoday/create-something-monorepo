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
			if (response.ok) {
				analytics = await response.json();
			}
		} catch (err) {
			console.warn('Failed to fetch user analytics:', err);
		}
	}

	return { user, analytics };
};
