import type { PageServerLoad } from './$types';
import { getFileBasedExperiment } from '$lib/config/fileBasedExperiments';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const experiment = getFileBasedExperiment('canvas-interactivity');

	if (!experiment) {
		throw error(404, 'Experiment not found');
	}

	return { experiment };
};
