import type { Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/kv';

/**
 * Server hooks for session management.
 *
 * Validates session token from cookie and populates locals.user
 * for protected routes.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('session_token');

	if (sessionToken && event.platform?.env.SESSIONS) {
		try {
			const sessionData = await getSession(event.platform.env.SESSIONS, sessionToken);
			if (sessionData) {
				event.locals.user = { email: sessionData.email };
			}
		} catch (error) {
			console.error('Session validation error in hooks:', error);
		}
	}

	// Protected routes check
	const protectedPaths = ['/dashboard', '/assets', '/profile', '/api/profile', '/api/keys', '/api/assets', '/api/analytics'];
	const isProtectedRoute = protectedPaths.some((path) => event.url.pathname.startsWith(path));

	if (isProtectedRoute && !event.locals.user) {
		// Redirect to login for protected pages
		if (!event.url.pathname.startsWith('/api/')) {
			return new Response(null, {
				status: 302,
				headers: { Location: '/login' }
			});
		}
		// Return 401 for API routes
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return resolve(event);
};
