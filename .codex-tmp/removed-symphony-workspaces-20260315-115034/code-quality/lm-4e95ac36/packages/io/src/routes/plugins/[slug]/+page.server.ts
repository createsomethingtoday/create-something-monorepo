import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getPlugin } from '$lib/config/plugins';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;
	const plugin = getPlugin(slug);

	if (!plugin) {
		throw error(404, 'Plugin not found');
	}

	return { plugin };
};
