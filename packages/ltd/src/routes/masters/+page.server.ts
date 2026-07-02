import type { PageServerLoad } from './$types';
import { loadMasters } from '$lib/server/masters';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env?.DB;

	return {
		masters: await loadMasters(db)
	};
};
