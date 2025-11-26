import type { PageServerLoad } from './$types';

// Static route - no server data needed
export const load: PageServerLoad = async () => {
	return {};
};
