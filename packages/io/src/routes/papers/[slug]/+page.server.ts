/**
 * Research Paper Detail - Fallback Route
 *
 * This dynamic route serves as a fallback for papers without their own
 * dedicated route folder. Since all current papers have their own
 * /papers/[name]/+page.svelte, this primarily handles 404s.
 *
 * Papers are now self-contained in their route folders with meta.ts
 * for listing metadata.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { PaperMeta } from '../types';

// Auto-discover all papers with meta.ts files
const paperModules = import.meta.glob<{ meta: PaperMeta }>('../*/meta.ts', { eager: true });
const validSlugs = new Set(Object.values(paperModules).map((mod) => mod.meta.slug));

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	// If this slug has a dedicated route folder, SvelteKit will use that instead.
	// This route only triggers for slugs without their own folder.
	// Since all papers have their own folders, this is effectively a 404 handler.
	if (!validSlugs.has(slug)) {
		throw error(404, 'Paper not found');
	}

	// If we somehow get here for a valid slug without a route folder,
	// redirect or show a minimal error
	throw error(404, 'Paper route not found');
};
