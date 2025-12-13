import type { LayoutServerLoad } from './$types';
import { siteConfig } from '$lib/config/site';

export const prerender = true;

export const load: LayoutServerLoad = async () => {
	return {
		siteConfig,
		tenant: null,
		configSource: 'static' as const
	};
};
