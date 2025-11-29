import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Simple password hashing verification (matches the hash we'll use for user creation)
async function verifyPassword(password: string, hash: string): Promise<boolean> {
	// Using Web Crypto API for password hashing
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	return computedHash === hash;
}

// Generate a secure random session token
function generateSessionToken(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
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

		// Find user by email
		const user = await db
			.prepare('SELECT * FROM users WHERE email = ?')
			.bind(email)
			.first();

		if (!user) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Verify password
		const isValid = await verifyPassword(password, user.password_hash as string);
		if (!isValid) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Check if user has admin role
		if (user.role !== 'admin') {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Generate session ID (used as token)
		const sessionId = generateSessionToken();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

		// Store session in database (sessions table uses id as token, data for additional info)
		await db
			.prepare(
				'INSERT INTO sessions (id, user_id, data, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
			)
			.bind(
				sessionId,
				user.id,
				JSON.stringify({ email: user.email, role: user.role }),
				expiresAt.toISOString(),
				new Date().toISOString()
			)
			.run();

		// Set session cookie (using session ID as token)
		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				role: user.role
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'Login failed' }, { status: 500 });
	}
};
