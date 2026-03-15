import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Check if the current session is valid.
 * Returns user email if authenticated.
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user?.email) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	return json({
		message: 'Session is valid',
		userEmail: locals.user.email
	});
};
