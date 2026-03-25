import type { LayoutServerLoad } from './$types';
import { getHasTemplateAsset } from '$lib/server/template-access';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	let hasTemplateAsset = false;

	if (locals.user?.email && platform?.env) {
		try {
			hasTemplateAsset = await getHasTemplateAsset(locals.user.email, platform?.env);
		} catch (err) {
			console.error('Error loading template asset entitlement:', err);
		}
	}

	return {
		user: locals.user || null,
		hasTemplateAsset
	};
};
