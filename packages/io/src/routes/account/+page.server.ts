import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	if (!user) {
		redirect(302, '/login?redirect=/account');
	}

	return { user };
};
