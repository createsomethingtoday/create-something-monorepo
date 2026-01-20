import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setSessionCookies } from '@create-something/components/auth';
import { identityClient, getIdentityErrorMessage } from '@create-something/components/api';
import { catchApiError, apiError, createLogger } from '@create-something/components/utils';

const logger = createLogger('AdminLoginAPI');

export const POST: RequestHandler = catchApiError('AdminLogin', async ({ request, platform, cookies }) => {
	const { email, password } = (await request.json()) as { email?: string; password?: string };

	if (!email || !password) {
		return apiError('Email and password are required', 400);
	}

	const db = platform?.env?.DB;
	if (!db) {
		return apiError('Database not available', 500);
	}

	logger.info('Admin login attempt', { email });

	// Authenticate via Identity Worker
	const result = await identityClient.login({ email, password });

	if (!result.success) {
		logger.warn('Login failed', { email, error: result.error });
		return json(
			{ error: getIdentityErrorMessage(result, 'Invalid credentials') },
			{ status: result.status }
		);
	}

	// Check if user has admin role in local DB
	const adminUser = await db
		.prepare('SELECT id, role FROM users WHERE email = ? AND role = ?')
		.bind(email, 'admin')
		.first();

	if (!adminUser) {
		logger.warn('Admin access denied', { email });
		return json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
	}

	// Set session cookies (JWT-based)
	const isProduction = platform?.env?.ENVIRONMENT === 'production';
	const domain = isProduction ? '.createsomething.io' : undefined;

	setSessionCookies(
		cookies,
		{
			accessToken: result.data.access_token,
			refreshToken: result.data.refresh_token,
			domain
		},
		isProduction ?? true
	);

	logger.info('Admin login successful', { email, userId: result.data.user.id });

	return json({
		success: true,
		user: {
			id: result.data.user.id,
			email: result.data.user.email,
			tier: result.data.user.tier || 'free',
			role: 'admin'
		}
	});
});
