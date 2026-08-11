import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAdminSession, verifyAdminLogin } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { getRuntimeEnv } from '$lib/server/env';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
	}

	const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	const password = typeof payload.password === 'string' ? payload.password : '';

	if (!password) {
		return json({ success: false, error: 'Password is required.' }, { status: 400 });
	}

	try {
		const db = getDb(platform);
		const env = getRuntimeEnv(platform);
		const admin = await verifyAdminLogin(db, env, password);

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
