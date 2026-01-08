/**
 * Work Case Study - Dynamic Route Server Load
 *
 * Loads work case studies from markdown content using MDsveX.
 */

import type { PageServerLoad } from './$types';
import { loadWorkBySlug } from '$lib/content-loader';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;
	const work = await loadWorkBySlug(slug);

	return {
		work
	};
};
