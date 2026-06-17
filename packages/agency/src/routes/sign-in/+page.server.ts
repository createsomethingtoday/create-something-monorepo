import { redirect } from '@sveltejs/kit';
import { getClerkSignInRouteState } from '$lib/server/clerk-sign-in';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, platform }) => {
	const state = getClerkSignInRouteState(url, platform?.env);

	if (state.canonicalUrl) {
		throw redirect(302, state.canonicalUrl);
	}

	return state;
};
