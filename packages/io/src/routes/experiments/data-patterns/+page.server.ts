import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getFileBasedExperiment } from '$lib/config/fileBasedExperiments';

export const load: PageServerLoad = async () => {
	const experiment = getFileBasedExperiment('data-patterns');

	if (!experiment) {
		throw error(404, 'Experiment not found');
	}

	return { experiment };
};
