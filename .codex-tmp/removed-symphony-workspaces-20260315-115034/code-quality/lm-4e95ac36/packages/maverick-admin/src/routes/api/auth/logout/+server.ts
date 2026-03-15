import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, platform }) => {
	const sessionId = cookies.get('session');

	if (sessionId && platform?.env.SESSIONS) {
		await platform.env.SESSIONS.delete(sessionId);
	}

	cookies.delete('session', { path: '/' });

	throw redirect(303, '/login');
};
