/**
 * Pattern Detail - Dynamic Markdown Route
 *
 * Loads patterns from markdown content files using MDsveX.
 * This route serves ALL patterns that don't have their own dedicated folder.
 *
 * Uses universal load (+page.ts) because Svelte components can't be serialized
 * from server to client in SSR mode.
 */

import type { PageLoad } from './$types';
import { loadPatternBySlug } from '$lib/content-loader';

export const load: PageLoad = async ({ params }) => {
	const { slug } = params;
	const pattern = await loadPatternBySlug(slug);

	return {
		pattern
	};
};
