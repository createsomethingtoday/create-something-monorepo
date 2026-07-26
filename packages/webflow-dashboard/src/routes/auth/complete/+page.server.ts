import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	SESSION_COOKIE_NAME,
	SESSION_COOKIE_OPTIONS,
	consumeSessionHandoff,
	getSession
} from '$lib/server/kv';

/**
 * Completes authentication in a top-level browsing context using a short-lived,
 * one-time handoff token created during verification.
 */
export const load: PageServerLoad = async ({ url, platform, cookies }) => {
	const handoffToken = url.searchParams.get('handoff');
	const sessions = platform?.env?.SESSIONS;

	if (!handoffToken || !sessions) {
		throw redirect(302, '/login');
	}

	const handoff = await consumeSessionHandoff(sessions, handoffToken);
	if (!handoff) {
		throw redirect(302, '/login');
	}

	const session = await getSession(sessions, handoff.sessionToken);
	if (!session) {
		throw redirect(302, '/login');
	}

	cookies.set(SESSION_COOKIE_NAME, handoff.sessionToken, SESSION_COOKIE_OPTIONS);

	throw redirect(302, '/dashboard');
};
