import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteCurrentSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	try {
		const db = getDb(platform);
		await deleteCurrentSession(db, cookies);
		return json({ success: true });
	} catch (error) {
		console.error('Admin logout failed:', error);
		cookies.delete('jj_admin_session', { path: '/' });
		return json({ success: true });
	}
};
