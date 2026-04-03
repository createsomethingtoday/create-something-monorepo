import { json, type RequestHandler } from '@sveltejs/kit';
import { ensureConciergeSession, resetPersistedConciergeSession } from '$lib/server/threads/session';

export const POST: RequestHandler = async ({ cookies, platform, url }) => {
	await resetPersistedConciergeSession(
		ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url }),
		platform
	);

	return json({ ok: true });
};
