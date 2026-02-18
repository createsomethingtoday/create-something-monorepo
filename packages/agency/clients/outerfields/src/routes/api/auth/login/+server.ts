import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getSessions } from '$lib/server/kv-compat';

// Simple password hashing for demo (in production use bcrypt)
async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
	const passwordHash = await hashPassword(password);
	return passwordHash === hash;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const body = await request.json();
		const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
		const password = typeof body.password === 'string' ? body.password : '';

		if (!email || !password) {
			return json({ success: false, error: 'Email and password are required' }, { status: 400 });
		}

		const db = getDBFromPlatform(platform);
		const sessions = getSessions();

		// Find user in database
		const result = await db
			.prepare(
				'SELECT id, email, name, password_hash, membership, created_at FROM users WHERE lower(email) = ?'
			)
			.bind(email)
			.first<{
				id: string;
				email: string;
				name: string;
				password_hash: string;
				membership: unknown;
				created_at: number;
			}>();

		if (!result) {
			return json({ success: false, error: 'Invalid credentials' }, { status: 401 });
		}

		const hasMembership = result.membership === true || result.membership === 1 || result.membership === '1';

		// Verify password
		const passwordValid = await verifyPassword(password, result.password_hash);
		if (!passwordValid) {
			return json({ success: false, error: 'Invalid credentials' }, { status: 401 });
		}

		// Create session
		const sessionToken = crypto.randomUUID();
		const sessionData = {
			userId: result.id,
			email: result.email,
			name: result.name,
			membership: hasMembership,
			createdAt: Date.now()
		};

		// Store session in KV with 24-hour expiration
		await sessions.put(
			`session:${sessionToken}`,
			JSON.stringify(sessionData),
			{ expirationTtl: 60 * 60 * 24 } // 24 hours
		);

		// Set session cookie
		const isSecure = new URL(request.url).protocol === 'https:';
		cookies.set('session_token', sessionToken, {
			path: '/',
			httpOnly: true,
			secure: isSecure,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 // 24 hours
		});

		// Return user data (without password hash)
		const user = {
			id: result.id,
			email: result.email,
			name: result.name,
			membership: hasMembership,
			createdAt: new Date(result.created_at).toISOString()
		};

		return json({ success: true, data: { user } });
	} catch (err) {
		console.error('Login error:', err);
		return json({ success: false, error: 'Login failed' }, { status: 500 });
	}
};
