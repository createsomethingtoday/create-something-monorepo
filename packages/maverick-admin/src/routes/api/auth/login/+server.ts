import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const formData = await request.formData();
	const email = formData.get('email')?.toString();
	const password = formData.get('password')?.toString();

	if (!email || !password) {
		return json({ error: 'Email and password required' }, { status: 400 });
	}

	const adminEmail = platform?.env.ADMIN_EMAIL;
	const adminPasswordHash = platform?.env.ADMIN_PASSWORD_HASH;

	// Simple email check (password hashing would use bcrypt in production)
	if (email !== adminEmail) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	// For production, use bcrypt.compare(password, adminPasswordHash)
	// For now, simple comparison (set ADMIN_PASSWORD_HASH to the actual password for dev)
	if (password !== adminPasswordHash) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	// Create session
	const sessionId = crypto.randomUUID();
	const sessionData = JSON.stringify({
		email,
		createdAt: Date.now()
	});

	// Store in KV with 24h expiration
	await platform?.env.SESSIONS.put(sessionId, sessionData, {
		expirationTtl: 86400
	});

	// Set cookie
	cookies.set('session', sessionId, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
		maxAge: 86400
	});

	throw redirect(303, '/dashboard');
};
