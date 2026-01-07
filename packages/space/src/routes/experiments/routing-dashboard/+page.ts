import type { PageLoad } from './$types';
import experiments from '$lib/data/routing-experiments.json';

export const load: PageLoad = async () => {
	return {
		success: true,
		data: experiments,
		count: experiments.length
	};
};
