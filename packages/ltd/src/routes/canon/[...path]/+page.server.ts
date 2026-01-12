/**
 * Canon Dynamic Route - Server Load Function
 *
 * Handles all nested canon pages using catch-all [...path] route.
 * Supports root (/canon), sections (/canon/concepts), and nested pages (/canon/concepts/zuhandenheit).
 */

import type { PageServerLoad } from './$types';
import { loadCanonByPath } from '$lib/content-loader';

export const load: PageServerLoad = async ({ params }) => {
	// Parse path: undefined for root, "concepts" for section, "concepts/zuhandenheit" for page
	const pathParts = params.path ? params.path.split('/') : [];

	const canonPage = await loadCanonByPath(pathParts);

	return {
		canonPage,
		pathParts
	};
};
