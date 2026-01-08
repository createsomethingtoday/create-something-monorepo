/**
 * Research Paper Detail - Dynamic Markdown Route
 *
 * Loads papers from markdown content files using MDsveX.
 * This route serves ALL papers that don't have their own dedicated folder.
 *
 * Static .svelte paper routes will be migrated to markdown content incrementally.
 */

import type { PageServerLoad } from './$types';
import { loadPaperBySlug } from '$lib/content-loader';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;
	const paper = await loadPaperBySlug(slug);

	return {
		paper
	};
};
