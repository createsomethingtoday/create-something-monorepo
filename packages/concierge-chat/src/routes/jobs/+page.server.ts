import type { PageServerLoad } from './$types';
import { loadPublicNursingJobs } from '$lib/server/abundance/public-jobs';

export const load: PageServerLoad = async ({ fetch, platform }) => {
	const publicJobs = await loadPublicNursingJobs({ fetch, platform });

	return {
		publicJobs
	};
};
