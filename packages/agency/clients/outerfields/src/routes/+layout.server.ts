import type { LayoutServerLoad } from './$types';

/**
 * OUTERFIELDS Root Layout Server Load
 *
 * Loads auth state from session for all pages
 */

export const load: LayoutServerLoad = async ({ locals }) => {
	// User is already set in locals by hooks.server.ts
	return {
		user: locals.user || null
	};
};
