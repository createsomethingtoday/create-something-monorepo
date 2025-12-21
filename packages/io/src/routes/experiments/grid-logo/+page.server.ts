import type { PageServerLoad } from './$types';
import { getFileBasedExperiment } from '$lib/config/fileBasedExperiments';

export const load: PageServerLoad = async () => {
	const experiment = getFileBasedExperiment('grid-logo');

	return {
		experiment
	};
};
