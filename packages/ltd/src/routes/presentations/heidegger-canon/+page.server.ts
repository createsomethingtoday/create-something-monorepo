import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'HEIDEGGER: CANON | A Presentation',
			description:
				'Install the CREATE SOMETHING methodology. Apply the Subtractive Triad. Build systems that disappear.',
			author: 'CREATE SOMETHING'
		}
	};
};
