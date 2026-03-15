import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface CreateUserRequest {
	email?: string;
	username?: string;
	password?: string;
	role?: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const { email, username, password, role = 'user' } = (await request.json()) as CreateUserRequest;

		if (!email || !password) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'Database not available' }, { status: 500 });
		}

		// Check if user already exists
		const existingUser = await db
			.prepare('SELECT id FROM users WHERE email = ?')
			.bind(email)
			.first();

		if (existingUser) {
			return json({ error: 'User already exists' }, { status: 409 });
		}

		// Hash password
		const passwordHash = await hashPassword(password);

		// Create user
		const userId = crypto.randomUUID();
		const now = new Date().toISOString();

		await db
			.prepare(
				'INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
			)
			.bind(userId, username || email.split('@')[0], email, passwordHash, role, now, now)
			.run();

		return json({
			success: true,
			user: {
				id: userId,
				email,
				username: username || email.split('@')[0],
				role
			}
		});
	} catch (error) {
		console.error('User creation error:', error);
		return json({ error: 'Failed to create user' }, { status: 500 });
	}
};
