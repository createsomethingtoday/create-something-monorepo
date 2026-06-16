import type { Handle } from '@sveltejs/kit';
import { getAdminFromCookie } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	try {
		const db = getDb(event.platform);
		const admin = await getAdminFromCookie(db, event.cookies);
		if (admin) event.locals.admin = admin;
	} catch (error) {
		if (event.cookies.get('jj_admin_session')) {
			console.error('Admin session lookup failed:', error);
			event.cookies.delete('jj_admin_session', { path: '/' });
		}
	}

	return resolve(event);
};
