import type { PageServerLoad } from './$types';
import { PLUGINS } from '$lib/config/plugins';

export const load: PageServerLoad = async () => {
	const plugins = PLUGINS;
	const categories = Array.from(new Set(plugins.map((p) => p.category))).sort();

	return {
		plugins,
		categories
	};
};
