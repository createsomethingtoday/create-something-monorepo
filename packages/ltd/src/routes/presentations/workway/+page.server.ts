import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'WORKWAY | A Presentation',
			description:
				'Build workflows with TypeScript. Deploy to the edge. Monetize in the marketplace.',
			author: 'CREATE SOMETHING'
		}
	};
};
