import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const formData = await request.formData();
	const email = formData.get('email')?.toString();
	const password = formData.get('password')?.toString();

	if (!email || !password) {
		return json({ error: 'Email and password required' }, { status: 400 });
	}

	const adminEmail = platform?.env.ADMIN_EMAIL;
	const adminPasswordHash = platform?.env.ADMIN_PASSWORD_HASH;

	if (!adminEmail || !adminPasswordHash) {
		console.error('ADMIN_EMAIL or ADMIN_PASSWORD_HASH not configured');
		return json({ error: 'Auth not configured' }, { status: 500 });
	}

	// Timing-safe comparison for both email and password
	if (!timingSafeEqual(email, adminEmail)) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	if (!timingSafeEqual(password, adminPasswordHash)) {
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
