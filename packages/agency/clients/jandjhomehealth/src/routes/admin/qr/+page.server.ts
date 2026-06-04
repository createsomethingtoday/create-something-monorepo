import type { PageServerLoad } from './$types';
import { getPublicBaseUrl, getRuntimeEnv } from '$lib/server/env';
import { requireAdmin } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, url, platform }) => {
	requireAdmin(locals, url);
	return {
		formUrl: getPublicBaseUrl(url, getRuntimeEnv(platform))
	};
};
