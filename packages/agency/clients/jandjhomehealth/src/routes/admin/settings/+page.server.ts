import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, url }) => {
	const admin = requireAdmin(locals, url);
	return { admin };
};
