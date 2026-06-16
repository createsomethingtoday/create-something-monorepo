import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createAdminSession,
	deleteSessionsForAdmin,
	upsertAdminPassword,
	verifyCurrentPassword
} from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { getRuntimeEnv } from '$lib/server/env';
import { validateNewPassword } from '$lib/server/password';

export const POST: RequestHandler = async ({ request, cookies, locals, platform }) => {
	if (!locals.admin) {
		return json({ success: false, error: 'Admin login required.' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
	}

	const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	const currentPassword = typeof payload.currentPassword === 'string' ? payload.currentPassword : '';
	const newPassword = typeof payload.newPassword === 'string' ? payload.newPassword : '';

	const passwordError = validateNewPassword(newPassword);
	if (!currentPassword || passwordError) {
		return json(
			{ success: false, error: passwordError || 'Current password is required.' },
			{ status: 400 }
		);
	}

	try {
		const db = getDb(platform);
		const env = getRuntimeEnv(platform);
		const valid = await verifyCurrentPassword(db, env, locals.admin.email, currentPassword);
		if (!valid) {
			return json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
		}

		await upsertAdminPassword(db, locals.admin.email, newPassword);
		await deleteSessionsForAdmin(db, locals.admin.email);
		await createAdminSession(
			db,
			cookies,
			locals.admin.email,
			new URL(request.url).protocol === 'https:'
		);

		return json({ success: true });
	} catch (error) {
		console.error('Admin password change failed:', error);
		return json({ success: false, error: 'Password change failed.' }, { status: 500 });
	}
};
