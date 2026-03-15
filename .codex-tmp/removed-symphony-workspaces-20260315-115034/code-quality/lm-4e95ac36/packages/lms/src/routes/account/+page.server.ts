/**
 * Account Page Server
 *
 * Fetches user profile from Identity Worker.
 *
 * Canon: Data flows like water—from source to form.
 */

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import type { UserAnalytics } from '@create-something/canon/analytics';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface UserProfile {
	id: string;
	email: string;
	email_verified: boolean;
	name?: string;
	avatar_url?: string;
	tier: 'free' | 'pro' | 'agency';
	analytics_opt_out: boolean;
	created_at: string;
}

export const load: PageServerLoad = async ({ cookies, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login?redirect=/account');
	}

	const accessToken = cookies.get('cs_access_token');

	if (!accessToken) {
		throw redirect(302, '/login?redirect=/account');
	}

	try {
		const response = await fetch(`${IDENTITY_WORKER}/v1/users/me`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			// Token might be invalid, redirect to login
			if (response.status === 401) {
				throw redirect(302, '/login?redirect=/account');
			}
			return { profile: null, error: 'Failed to load profile' };
		}

		const profile = (await response.json()) as UserProfile;

		// Fetch analytics from .io aggregator if user hasn't opted out
		let analytics: UserAnalytics | null = null;

		if (!profile.analytics_opt_out) {
			try {
				const analyticsResponse = await fetch('https://createsomething.io/api/user/analytics/aggregate?days=30', {
					headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
				});
				if (analyticsResponse.ok) {
					analytics = await analyticsResponse.json();
				}
			} catch (err) {
				console.warn('Failed to fetch user analytics:', err);
			}
		}

		return { profile, analytics };
	} catch (err) {
		if (err instanceof Response || (err as { status?: number }).status === 302) {
			throw err;
		}
		console.error('Profile fetch error:', err);
		return { profile: null, analytics: null, error: 'Failed to load profile' };
	}
};
