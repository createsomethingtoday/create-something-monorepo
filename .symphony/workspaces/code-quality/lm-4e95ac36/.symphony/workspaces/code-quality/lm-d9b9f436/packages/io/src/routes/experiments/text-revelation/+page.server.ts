import type { PageServerLoad } from './$types';
import { getFileBasedExperiment } from '$lib/config/fileBasedExperiments';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const experiment = getFileBasedExperiment('text-revelation');

	if (!experiment) {
		throw error(404, 'Experiment not found');
	}

	return { experiment };
};
