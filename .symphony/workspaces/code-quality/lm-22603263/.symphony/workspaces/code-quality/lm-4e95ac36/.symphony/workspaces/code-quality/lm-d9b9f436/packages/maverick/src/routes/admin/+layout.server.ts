/**
 * Admin Layout Server - Authentication gate
 * Redirects unauthenticated users to login
 */

import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { validateSession } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies, platform, url }) => {
	// Allow embedded mode without auth (Webflow iframe)
	if (url.searchParams.get('embed') === 'true') {
		return {};
	}

	const sessionId = cookies.get('maverick_session');
	if (!sessionId) {
		throw redirect(303, '/admin/login');
	}

	const sessions = platform?.env?.SESSIONS;
	if (!sessions) {
		throw redirect(303, '/admin/login');
	}

	const session = await validateSession(sessionId, sessions);
	if (!session) {
		cookies.delete('maverick_session', { path: '/' });
		throw redirect(303, '/admin/login');
	}

	return {
		user: { email: session.email }
	};
};
