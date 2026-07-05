import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadMasterProfile } from '$lib/server/masters';

export const load: PageServerLoad = async ({ params, platform }) => {
	// arena-taste content lives at /taste, not /masters
	if (params.slug === 'arena-taste') {
		throw error(404, 'Not found');
	}

	const db = platform?.env?.DB;

	return loadMasterProfile(db, params.slug);
};
