import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Demo accounts for the landing page showcase
const DEMO_ACCOUNTS = [
	{
		email: 'demo@outerfields.com',
		password: 'demo123',
		user: { id: 'demo_user_001', email: 'demo@outerfields.com', name: 'Demo User', role: 'user' }
	},
	{
		email: 'admin@outerfields.com',
		password: 'demo123',
		user: { id: 'demo_admin_001', email: 'admin@outerfields.com', name: 'Admin Demo', role: 'admin' }
	}
];

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const { email, password } = body;

		if (!email || !password) {
			return json({ success: false, error: 'Email and password are required' }, { status: 400 });
		}

		// Check for demo accounts first
		const demoAccount = DEMO_ACCOUNTS.find(
			(account) => account.email === email && account.password === password
		);

		if (demoAccount) {
			// Generate a simple demo token (not for production use)
			const demoToken = btoa(JSON.stringify({ ...demoAccount.user, exp: Date.now() + 3600000 }));

			// Set session cookies for demo
			cookies.set('access_token', demoToken, {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: 60 * 60 // 1 hour
			});

			cookies.set('user_role', demoAccount.user.role, {
				path: '/',
				httpOnly: false,
				secure: true,
				sameSite: 'lax',
				maxAge: 60 * 60 // 1 hour
			});

			return json({ success: true, data: { user: demoAccount.user } });
		}

		// For non-demo accounts, return invalid credentials
		// (In production, this would call the real Identity API)
		return json({ success: false, error: 'Invalid credentials' }, { status: 401 });
	} catch (err) {
		console.error('Login error:', err);
		return json({ success: false, error: 'Login failed' }, { status: 500 });
	}
};
