import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

const publicPaths = ['/login', '/api/auth/login'];

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Skip auth for public paths
	if (publicPaths.some(path => pathname.startsWith(path))) {
		return resolve(event);
	}

	// Check session for protected routes
	if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
		const sessionId = event.cookies.get('session');

		if (!sessionId) {
			throw redirect(303, '/login');
		}

		// Validate session from KV
		const sessionData = await event.platform?.env.SESSIONS.get(sessionId);

		if (!sessionData) {
			event.cookies.delete('session', { path: '/' });
			throw redirect(303, '/login');
		}

		// Parse and attach user to locals
		try {
			const session = JSON.parse(sessionData);
			event.locals.user = { email: session.email };
		} catch {
			throw redirect(303, '/login');
		}
	}

	return resolve(event);
};
