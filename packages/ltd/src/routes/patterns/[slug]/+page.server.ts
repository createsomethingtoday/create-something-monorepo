/**
 * Pattern Detail - Dynamic Markdown Route
 *
 * Loads patterns from markdown content files using MDsveX.
 * This route serves ALL patterns that don't have their own dedicated folder.
 *
 * Static .svelte pattern routes have been migrated to markdown content.
 */

import type { PageServerLoad } from './$types';
import { loadPatternBySlug } from '$lib/content-loader';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;
	const pattern = await loadPatternBySlug(slug);

	return {
		pattern
	};
};
