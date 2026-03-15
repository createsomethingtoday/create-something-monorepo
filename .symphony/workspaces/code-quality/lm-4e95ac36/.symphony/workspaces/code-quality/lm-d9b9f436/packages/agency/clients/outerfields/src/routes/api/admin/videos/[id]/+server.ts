import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdminUser } from '$lib/server/auth';

const LEGACY_WRITE_MIGRATION = {
	error: 'Legacy write endpoint retired. Use v1 admin video endpoints.',
	adminVideosApi: '/api/v1/admin/videos/:id'
} as const;

export const PATCH: RequestHandler = async ({ locals }) => {
	if (!isAdminUser(locals.user)) {
		return json({ success: false, error: 'Not authorized' }, { status: 403 });
	}

	return json({ success: false, ...LEGACY_WRITE_MIGRATION }, { status: 410 });
};

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!isAdminUser(locals.user)) {
		return json({ success: false, error: 'Not authorized' }, { status: 403 });
	}

	return json({ success: false, ...LEGACY_WRITE_MIGRATION }, { status: 410 });
};
