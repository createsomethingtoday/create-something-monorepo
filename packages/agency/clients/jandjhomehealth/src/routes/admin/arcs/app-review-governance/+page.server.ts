import type { PageServerLoad } from './$types';
import { getOrCreateAppReviewArc } from '$lib/server/arc-store';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	const admin = requireAdmin(locals, url);
	const document = await getOrCreateAppReviewArc(getDb(platform));
	return { admin, document };
};
