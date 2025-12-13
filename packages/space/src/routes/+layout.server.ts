import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ platform }) => {
	return {
		turnstileSiteKey: platform?.env?.TURNSTILE_SITE_KEY ?? ''
	};
};
