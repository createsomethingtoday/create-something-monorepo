import { redirect, type Handle } from '@sveltejs/kit';

// Public routes that don't require authentication
const publicRoutes = [
	'/login',
	'/api/auth/login',
	'/api/auth/verify-token',
	'/api/v1/' // External API uses API key auth, not session
];

function isPublicRoute(pathname: string): boolean {
	return publicRoutes.some(route =>
		pathname === route || pathname.startsWith(route)
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Skip auth for public routes
	if (isPublicRoute(pathname)) {
		return resolve(event);
	}

	// Get session token from cookie
	const sessionToken = event.cookies.get('session_token');

	if (!sessionToken) {
		// No session - redirect to login for pages, 401 for API
		if (pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		throw redirect(303, '/login');
	}

	// Validate session in KV
	const kv = event.platform?.env.SESSIONS;
	if (!kv) {
		console.error('KV namespace not available');
		throw redirect(303, '/login');
	}

	try {
		const email = await kv.get(sessionToken);

		if (!email) {
			// Invalid or expired session - clear cookie and redirect
			event.cookies.delete('session_token', { path: '/' });

			if (pathname.startsWith('/api/')) {
				return new Response(JSON.stringify({ error: 'Session expired' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			throw redirect(303, '/login');
		}

		// Session valid - set user in locals
		event.locals.user = {
			id: email,
			email: email
		};
	} catch (error) {
		console.error('Session validation error:', error);

		if (pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Internal server error' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		throw redirect(303, '/login');
	}

	return resolve(event);
};
