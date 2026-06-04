import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createAdminSession,
	deleteSessionsForAdmin,
	upsertAdminPassword
} from '$lib/server/auth';
import { getDb, nowIso } from '$lib/server/db';
import { getRuntimeEnv, isAllowedAdminEmail } from '$lib/server/env';
import { sha256Token, validateNewPassword } from '$lib/server/password';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
	}

	const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	const token = typeof payload.token === 'string' ? payload.token : '';
	const newPassword = typeof payload.newPassword === 'string' ? payload.newPassword : '';
	const passwordError = validateNewPassword(newPassword);

	if (!token || passwordError) {
		return json(
			{ success: false, error: passwordError || 'Reset token is required.' },
			{ status: 400 }
		);
	}

	try {
		const db = getDb(platform);
		const env = getRuntimeEnv(platform);
		const tokenHash = await sha256Token(token);
		const reset = await db
			.prepare(
				`SELECT id, email, expires_at, used_at
				 FROM admin_password_resets
				 WHERE token_hash = ?`
			)
			.bind(tokenHash)
			.first<{ id: string; email: string; expires_at: string; used_at: string | null }>();

		if (
			!reset ||
			reset.used_at ||
			Date.parse(reset.expires_at) <= Date.now() ||
			!isAllowedAdminEmail(reset.email, env)
		) {
			return json({ success: false, error: 'Reset link is invalid or expired.' }, { status: 400 });
		}

		await upsertAdminPassword(db, reset.email, newPassword);
		await db
			.prepare('UPDATE admin_password_resets SET used_at = ? WHERE id = ?')
			.bind(nowIso(), reset.id)
			.run();
		await deleteSessionsForAdmin(db, reset.email);
		await createAdminSession(db, cookies, reset.email, new URL(request.url).protocol === 'https:');

		return json({ success: true });
	} catch (error) {
		console.error('Admin password reset failed:', error);
		return json({ success: false, error: 'Password reset failed.' }, { status: 500 });
	}
};
