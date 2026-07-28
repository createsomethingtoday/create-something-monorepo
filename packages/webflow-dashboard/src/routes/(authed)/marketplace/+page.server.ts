import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { user, hasTemplateAsset } = await parent();

	if (!user) {
		throw redirect(302, '/login');
	}

	if (!hasTemplateAsset) {
		throw redirect(302, '/dashboard');
	}

	return {
		marketplaceData: null,
		marketplaceError: null
	};
};
