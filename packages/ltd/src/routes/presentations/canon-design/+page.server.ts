import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'CANON: DESIGN | A Presentation',
			description:
				'Tailwind for structure, Canon for aesthetics. How design tokens emerge from philosophy and guide aesthetic coherence across the monorepo.',
			author: 'CREATE SOMETHING'
		}
	};
};
