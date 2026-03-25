import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { consumeSessionHandoff, getSession } from '$lib/server/kv';

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

	cookies.set('session_token', handoff.sessionToken, {
		httpOnly: true,
		secure: true,
		path: '/',
		maxAge: 60 * 60 * 2,
		sameSite: 'none'
	});

	throw redirect(302, '/dashboard');
};
