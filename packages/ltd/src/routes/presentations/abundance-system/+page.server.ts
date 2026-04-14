import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'ABUNDANCE | Nurse Acquisition Operating Layer',
			description:
				'A client-facing walkthrough of how Abundance sits above approved openings, captures nurse-side profile data, enforces qualification gates, and frames directional budget ranges for acquisition.',
			author: 'CREATE SOMETHING'
		}
	};
};
