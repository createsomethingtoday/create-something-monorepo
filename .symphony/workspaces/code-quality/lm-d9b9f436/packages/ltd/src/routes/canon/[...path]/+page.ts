/**
 * Canon Dynamic Route - Universal Load Function
 *
 * Handles all nested canon pages using catch-all [...path] route.
 * Supports root (/canon), sections (/canon/concepts), and nested pages (/canon/concepts/zuhandenheit).
 *
 * Uses universal load (+page.ts) because Svelte components can't be serialized
 * from server to client in SSR mode.
 */

import type { PageLoad } from './$types';
import { loadCanonByPath } from '$lib/content-loader';

export const load: PageLoad = async ({ params }) => {
	// Parse path: undefined for root, "concepts" for section, "concepts/zuhandenheit" for page
	const pathParts = params.path ? params.path.split('/') : [];

	const canonPage = await loadCanonByPath(pathParts);

	return {
		canonPage,
		pathParts
	};
};
