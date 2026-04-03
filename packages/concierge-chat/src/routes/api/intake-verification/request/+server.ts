import { json, type RequestHandler } from '@sveltejs/kit';
import { ensureConciergeSession } from '$lib/server/threads/session';
import { requestIntakeVerificationChallenge } from '$lib/server/intake-verification';

export const POST: RequestHandler = async ({ cookies, platform, request, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });

	let payload: { email?: unknown } | null = null;

	try {
		payload = (await request.json()) as { email?: unknown };
	} catch {
		payload = null;
	}

	if (!payload || typeof payload.email !== 'string') {
		return json({ message: 'A valid email address is required.' }, { status: 400 });
	}

	const result = await requestIntakeVerificationChallenge({
		sessionId,
		email: payload.email,
		platform
	});

	return json({ ok: true, ...result });
};
