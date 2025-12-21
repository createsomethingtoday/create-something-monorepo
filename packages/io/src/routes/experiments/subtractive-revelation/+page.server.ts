import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'Subtractive Revelation',
			description: 'Creation is the discipline of removing what obscures.'
		}
	};
};
