import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'CLOUDFLARE: EDGE | A Presentation',
			description:
				'Global infrastructure that disappears. D1, KV, R2, Workers, and Pages—deployed to the edge.',
			author: 'CREATE SOMETHING'
		}
	};
};
