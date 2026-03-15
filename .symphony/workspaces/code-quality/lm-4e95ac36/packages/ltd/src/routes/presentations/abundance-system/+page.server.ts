import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'ABUNDANCE | Nurse Staffing System',
			description:
				'A client-facing walkthrough of how Abundance captures profile data, ranks matches, uses policy controls, and frames directional budget ranges for nurse staffing.',
			author: 'CREATE SOMETHING'
		}
	};
};
