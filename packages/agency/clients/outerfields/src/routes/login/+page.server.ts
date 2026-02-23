import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { isAdminUser } from '$lib/server/admin';
import { resolveRuntimeEnv } from '$lib/server/env';

export const load: PageServerLoad = async ({ url, locals, platform }) => {
	// Check if already authenticated via session
	if (locals.user) {
		const runtimeEnv = resolveRuntimeEnv(
			((platform as { env?: Record<string, string | undefined> } | undefined)?.env)
		);
		const adminHome = '/admin/videos';
		const defaultHome = isAdminUser(locals.user, runtimeEnv) ? adminHome : '/demo';
		const redirectTo = url.searchParams.get('redirect') || defaultHome;
		redirect(302, redirectTo);
	}

	return {
		redirectTo: url.searchParams.get('redirect') || '/demo'
	};
};
