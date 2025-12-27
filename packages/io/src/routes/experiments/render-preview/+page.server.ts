import type { PageServerLoad } from './$types';
import { getFileBasedExperiment } from '$lib/config/fileBasedExperiments';

export const load: PageServerLoad = async () => {
	const experiment = getFileBasedExperiment('render-preview');
	if (!experiment) {
		throw new Error('Experiment not found');
	}
	return { experiment };
};
