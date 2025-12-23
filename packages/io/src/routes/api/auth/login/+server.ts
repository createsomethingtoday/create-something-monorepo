import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setSessionCookies, type TokenResponse, type User } from '@create-something/components/auth';

const IDENTITY_API = 'https://id.createsomething.space';

interface LoginResponse extends TokenResponse {
	user: User;
}

interface ErrorResponse {
	error: string;
}

interface LoginRequest {
	email?: string;
	password?: string;
}

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	try {
		const { email, password } = (await request.json()) as LoginRequest;

		if (!email || !password) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'Database not available' }, { status: 500 });
		}

		// Authenticate via Identity Worker
		const response = await fetch(`${IDENTITY_API}/v1/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			return json({ error: errorResult.error || 'Invalid credentials' }, { status: response.status });
		}

		const result = (await response.json()) as LoginResponse;

		// Check if user has admin role in local DB
		const adminUser = await db
			.prepare('SELECT id, role FROM users WHERE email = ? AND role = ?')
			.bind(email, 'admin')
			.first();

		if (!adminUser) {
			return json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
		}

		// Set session cookies (JWT-based)
		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? '.createsomething.io' : undefined;

		setSessionCookies(
			cookies,
			{
				accessToken: result.access_token,
				refreshToken: result.refresh_token,
				domain
			},
			isProduction ?? true
		);

		return json({
			success: true,
			user: {
				id: result.user.id,
				email: result.user.email,
				tier: result.user.tier,
				role: 'admin' // Local admin status
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'Login failed' }, { status: 500 });
	}
};
