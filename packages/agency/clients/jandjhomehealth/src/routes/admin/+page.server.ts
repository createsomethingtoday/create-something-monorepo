import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRuntimeEnv } from '$lib/server/env';

export const load: PageServerLoad = async ({ locals, url, platform }) => {
	const redirectTo = url.searchParams.get('redirect') || '/admin/contacts';
	if (locals.admin) redirect(302, redirectTo);

	const env = getRuntimeEnv(platform);
	return {
		redirectTo,
		resetAvailable: Boolean(env.RESEND_API_KEY)
	};
};
