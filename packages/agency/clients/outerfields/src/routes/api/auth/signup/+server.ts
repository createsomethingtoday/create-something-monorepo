import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

// Simple password hashing for demo (in production use bcrypt)
async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const body = await request.json();
		const { email, password, name } = body;

		if (!email || !password) {
			return json({ success: false, error: 'Email and password are required' }, { status: 400 });
		}

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return json({ success: false, error: 'Name is required' }, { status: 400 });
		}

		// Check if DB and SESSIONS are available
		const env = platform?.env as { DB?: D1Database; SESSIONS?: KVNamespace } | undefined;
		if (!env?.DB || !env?.SESSIONS) {
			return json(
				{ success: false, error: 'Database not configured' },
				{ status: 500 }
			);
		}

		// Prevent duplicate accounts
		const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
			.bind(email)
			.first<{ id: string }>();
		if (existing) {
			return json({ success: false, error: 'Account already exists' }, { status: 409 });
		}

		const userId = crypto.randomUUID();
		const now = Date.now();
		const passwordHash = await hashPassword(password);

		await env.DB.prepare(
			`INSERT INTO users (id, email, password_hash, name, membership, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
			.bind(userId, email, passwordHash, name.trim(), 0, now, now)
			.run();

		// Create session
		const sessionToken = crypto.randomUUID();
		const sessionData = {
			userId,
			email,
			name: name.trim(),
			membership: false,
			createdAt: now
		};

		await env.SESSIONS.put(`session:${sessionToken}`, JSON.stringify(sessionData), {
			expirationTtl: 60 * 60 * 24 // 24 hours
		});

		// Set session cookies
		const isSecure = new URL(request.url).protocol === 'https:';
		cookies.set('session_token', sessionToken, {
			path: '/',
			httpOnly: true,
			secure: isSecure,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 // 24 hours
		});

		const user = {
			id: userId,
			email,
			name: name.trim(),
			membership: false,
			createdAt: new Date(now).toISOString()
		};

		return json({ success: true, data: { user } });
	} catch (err) {
		console.error('Signup error:', err);
		return json({ success: false, error: 'Signup failed' }, { status: 500 });
	}
};
