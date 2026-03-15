import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'DEPLOYMENT: DWELLING | A Presentation',
			description:
				'Shipping to production and ongoing dwelling. The final step is not deployment—it is beginning to dwell.',
			author: 'CREATE SOMETHING'
		}
	};
};
