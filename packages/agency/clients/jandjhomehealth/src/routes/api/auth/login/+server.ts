import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAdminSession, verifyAdminLogin } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { getRuntimeEnv, normalizeEmail } from '$lib/server/env';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
	}

	const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	const email = typeof payload.email === 'string' ? normalizeEmail(payload.email) : '';
	const password = typeof payload.password === 'string' ? payload.password : '';

	if (!email || !password) {
		return json({ success: false, error: 'Email and password are required.' }, { status: 400 });
	}

	try {
		const db = getDb(platform);
		const env = getRuntimeEnv(platform);
		const admin = await verifyAdminLogin(db, env, email, password);

		if (!admin) {
			return json({ success: false, error: 'Invalid credentials.' }, { status: 401 });
		}

		const isSecure = new URL(request.url).protocol === 'https:';
		await createAdminSession(db, cookies, admin.email, isSecure);
		return json({ success: true, data: { admin } });
	} catch (error) {
		console.error('Admin login failed:', error);
		return json({ success: false, error: 'Login failed.' }, { status: 500 });
	}
};
