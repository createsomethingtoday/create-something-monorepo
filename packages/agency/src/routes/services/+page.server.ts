import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return {
		recommendedService: url.searchParams.get('service'),
		assessmentId: url.searchParams.get('assessment'),
		triadLevel: url.searchParams.get('triad')
	};
};
