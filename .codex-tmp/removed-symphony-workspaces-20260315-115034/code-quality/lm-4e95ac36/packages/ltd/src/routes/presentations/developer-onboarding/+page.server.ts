import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'Developer Onboarding | WORKWAY',
			description:
				'Join the waitlist, create your profile, and start building on WORKWAY.',
			author: 'CREATE SOMETHING'
		}
	};
};
