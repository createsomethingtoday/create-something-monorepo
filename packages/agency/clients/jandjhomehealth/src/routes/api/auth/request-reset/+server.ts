import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, nowIso, addSeconds } from '$lib/server/db';
import { getPublicBaseUrl, getRuntimeEnv, isAllowedAdminEmail, normalizeEmail } from '$lib/server/env';
import { sendPasswordResetEmail } from '$lib/server/email';
import { randomToken, sha256Token } from '$lib/server/password';

const RESET_TTL_SECONDS = 60 * 30;

export const POST: RequestHandler = async ({ request, platform, url }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
	}

	const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	const email = typeof payload.email === 'string' ? normalizeEmail(payload.email) : '';
	const env = getRuntimeEnv(platform);

	if (!email) {
		return json({ success: false, error: 'Email is required.' }, { status: 400 });
	}

	if (!isAllowedAdminEmail(email, env)) {
		return json({ success: true });
	}

	if (!env.RESEND_API_KEY) {
		return json(
			{ success: false, error: 'Password reset email is not configured.' },
			{ status: 503 }
		);
	}

	try {
		const db = getDb(platform);
		const token = randomToken();
		const tokenHash = await sha256Token(token);
		const createdAt = new Date();
		const expiresAt = addSeconds(createdAt, RESET_TTL_SECONDS);
		const resetUrl = `${getPublicBaseUrl(url, env)}/admin/reset?token=${encodeURIComponent(token)}`;

		await db
			.prepare(
				`INSERT INTO admin_password_resets (id, email, token_hash, created_at, expires_at, used_at)
				 VALUES (?, ?, ?, ?, ?, NULL)`
			)
			.bind(crypto.randomUUID(), email, tokenHash, nowIso(), expiresAt.toISOString())
			.run();

		await sendPasswordResetEmail(env, email, resetUrl);
		return json({ success: true });
	} catch (error) {
		console.error('Admin password reset request failed:', error);
		return json({ success: false, error: 'Password reset request failed.' }, { status: 500 });
	}
};
