import { redirect, type Handle } from '@sveltejs/kit';
import { createSessionManager, type User } from '@create-something/components/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const isProduction = event.platform?.env?.ENVIRONMENT === 'production';
	const domain = isProduction ? '.createsomething.io' : undefined;

	// Check if accessing admin routes (except login page)
	const isAdminRoute = event.url.pathname.startsWith('/admin');
	const isAdminApiRoute = event.url.pathname.startsWith('/api/admin');
	const isUserApiRoute = event.url.pathname.startsWith('/api/user');
	const isLoginPage = event.url.pathname === '/admin/login';
	const isAuthApi = event.url.pathname.startsWith('/api/auth');

	// Set locals.user for user API routes (analytics, preferences, etc.)
	if (isUserApiRoute) {
		const sessionManager = createSessionManager(event.cookies, {
			isProduction: isProduction ?? true,
			domain
		});

		const user = await sessionManager.getUser();
		if (user) {
			event.locals.user = {
				id: user.id,
				email: user.email,
				username: user.email.split('@')[0],
				role: 'user',
				tier: user.tier
			};
		}
	}

	if ((isAdminRoute && !isLoginPage && !isAuthApi) || isAdminApiRoute) {
		// Create session manager for JWT validation
		const sessionManager = createSessionManager(event.cookies, {
			isProduction: isProduction ?? true,
			domain
		});

		// Get user from JWT
		const user = await sessionManager.getUser();

		if (!user) {
			if (isAdminApiRoute) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			throw redirect(303, '/admin/login');
		}

		// Verify admin role in local D1 database
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

		const adminUser = await db
			.prepare('SELECT id, email, username, role FROM users WHERE email = ? AND role = ?')
			.bind(user.email, 'admin')
			.first();

		if (!adminUser) {
			// User is authenticated but not an admin
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
			id: user.id,
			email: user.email,
			username: (adminUser.username as string) || user.email.split('@')[0],
			role: 'admin',
			tier: user.tier
		};
	}

	// If already logged in and trying to access login page, redirect to admin
	if (isLoginPage) {
		const sessionManager = createSessionManager(event.cookies, {
			isProduction: isProduction ?? true,
			domain
		});

		const user = await sessionManager.getUser();
		if (user) {
			// Check if user has admin role
			const db = event.platform?.env?.DB;
			if (db) {
				const adminUser = await db
					.prepare('SELECT id FROM users WHERE email = ? AND role = ?')
					.bind(user.email, 'admin')
					.first();

				if (adminUser) {
					throw redirect(303, '/admin');
				}
			}
		}
	}

	return resolve(event);
};
