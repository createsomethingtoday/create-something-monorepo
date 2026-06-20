/**
 * Layout Server
 *
 * Exposes user authentication state to the client.
 *
 * Canon: Identity flows through the system, not stored in fragments.
 */

import type { LayoutServerLoad } from './$types';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface IdentityProfile {
	analytics_opt_out?: boolean;
}

export const load: LayoutServerLoad = async ({ locals, cookies, platform }) => {
	let analyticsOptOut = locals.user?.analytics_opt_out ?? false;
	const accessToken = cookies.get('cs_access_token');

	if (locals.user) {
		if (!accessToken) {
			analyticsOptOut = true;
		} else {
			try {
				const identityWorkerUrl = platform?.env?.IDENTITY_WORKER_URL || IDENTITY_WORKER;
				const response = await fetch(`${identityWorkerUrl}/v1/users/me`, {
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				});

				if (response.ok) {
					const profile = (await response.json()) as IdentityProfile;
					analyticsOptOut = profile.analytics_opt_out ?? analyticsOptOut;
				} else {
					analyticsOptOut = true;
				}
			} catch (err) {
				console.warn('Failed to load analytics opt-out preference:', err);
				analyticsOptOut = true;
			}
		}
	}

	return {
		user: locals.user ? { ...locals.user, analytics_opt_out: analyticsOptOut } : null,
	};
};
