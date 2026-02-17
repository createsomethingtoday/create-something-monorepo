import type { LayoutServerLoad } from './$types';
import { isAdminUser } from '$lib/server/admin';

/**
 * OUTERFIELDS Root Layout Server Load
 *
 * Loads auth state from session for all pages
 */

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	// User is already set in locals by hooks.server.ts
	const user = locals.user || null;

	return {
		user,
		isAdmin: isAdminUser(user, platform?.env)
	};
};
