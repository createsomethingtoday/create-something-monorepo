import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'ABUNDANCE | Nurse Staffing System',
			description:
				'A client-facing walkthrough of how Abundance captures profile data, ranks matches, and uses policy controls to keep nurse staffing workflows legible and safe.',
			author: 'CREATE SOMETHING'
		}
	};
};
