import { json, type RequestHandler } from '@sveltejs/kit';
import { verifyIntakeVerificationChallenge } from '$lib/server/intake-verification';
import { ensureConciergeSession } from '$lib/server/threads/session';

export const POST: RequestHandler = async ({ cookies, platform, request, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });

	let payload: { email?: unknown; code?: unknown } | null = null;

	try {
		payload = (await request.json()) as { email?: unknown; code?: unknown };
	} catch {
		payload = null;
	}

	if (!payload || typeof payload.email !== 'string' || typeof payload.code !== 'string') {
		return json({ message: 'Both email and verification code are required.' }, { status: 400 });
	}

	const result = await verifyIntakeVerificationChallenge({
		sessionId,
		email: payload.email,
		code: payload.code,
		cookies,
		secure: url.protocol === 'https:',
		platform
	});

	return json({ ok: true, ...result });
};
