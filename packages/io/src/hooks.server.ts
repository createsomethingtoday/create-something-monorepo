import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('session');

	// Check if accessing admin routes (except login page)
	const isAdminRoute = event.url.pathname.startsWith('/admin');
	const isAdminApiRoute = event.url.pathname.startsWith('/api/admin');
	const isLoginPage = event.url.pathname === '/admin/login';
	const isAuthApi = event.url.pathname.startsWith('/api/auth');

	if ((isAdminRoute && !isLoginPage && !isAuthApi) || isAdminApiRoute) {
		// Require authentication for admin routes
		if (!sessionToken) {
			if (isAdminApiRoute) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			throw redirect(303, '/admin/login');
		}

		const db = event.platform?.env?.DB;
		if (!db) {
			if (isAdminApiRoute) {
				return new Response(JSON.stringify({ error: 'Database not available' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			throw redirect(303, '/admin/login');
		}

		// Verify session is valid and not expired (using id as token)
		const session = await db
			.prepare(
				`SELECT s.*, u.id as user_id, u.email, u.username, u.role
				FROM sessions s
				JOIN users u ON s.user_id = u.id
				WHERE s.id = ? AND s.expires_at > datetime('now')`
			)
			.bind(sessionToken)
			.first();

		if (!session) {
			// Invalid or expired session
			event.cookies.delete('session', { path: '/' });
			if (isAdminApiRoute) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			throw redirect(303, '/admin/login');
		}

		// Verify user has admin role
		if (session.role !== 'admin') {
			if (isAdminApiRoute) {
				return new Response(JSON.stringify({ error: 'Forbidden' }), {
					status: 403,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			throw redirect(303, '/admin/login');
		}

		// Add user to locals for use in routes
		event.locals.user = {
			id: session.user_id as string,
			email: session.email as string,
			username: session.username as string,
			role: session.role as string
		};
	}

	// If already logged in and trying to access login page, redirect to admin
	if (isLoginPage && sessionToken) {
		const db = event.platform?.env?.DB;
		if (db) {
			const session = await db
				.prepare(
					`SELECT s.* FROM sessions s
					WHERE s.id = ? AND s.expires_at > datetime('now')`
				)
				.bind(sessionToken)
				.first();

			if (session) {
				throw redirect(303, '/admin');
			}
		}
	}

	return resolve(event);
};
