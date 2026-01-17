/**
 * Research Paper Detail - Dynamic Route Fallback
 *
 * All io papers are static Svelte routes with interactive components.
 * This dynamic [slug] route exists to catch any non-static slug and return 404.
 *
 * Static paper routes are in: /routes/papers/{slug}/+page.svelte
 * The manifest at /api/manifest lists all valid paper slugs.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// All io papers are static routes with their own +page.svelte
	// If we reach this dynamic route, the paper doesn't exist
	throw error(404, `Paper not found: ${params.slug}`);
};
