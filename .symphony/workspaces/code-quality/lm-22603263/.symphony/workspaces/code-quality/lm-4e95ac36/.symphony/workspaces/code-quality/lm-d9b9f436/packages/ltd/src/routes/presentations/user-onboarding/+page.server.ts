import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'User Onboarding | WORKWAY',
			description:
				'Enable a workflow in minutes. Connect your tools. Let automation handle the rest.',
			author: 'CREATE SOMETHING'
		}
	};
};
