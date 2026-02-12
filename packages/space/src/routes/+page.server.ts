import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// The workbench homepage is static — no D1 queries needed.
	// Individual tools load their own data.
	return {};
};
