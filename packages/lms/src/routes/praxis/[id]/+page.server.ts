import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPraxisExercise } from '$lib/content/praxis';
import { PATHS } from '$lib/content/paths';

export const load: PageServerLoad = async ({ params }) => {
	const exercise = getPraxisExercise(params.id);

	if (!exercise) {
		throw error(404, {
			message: `Exercise "${params.id}" not found`
		});
	}

	const path = PATHS.find((p) => p.id === exercise.pathId);

	return {
		exercise,
		pathTitle: path?.title ?? exercise.pathId
	};
};
