/**
 * Layout Server
 *
 * Exposes user authentication state to the client.
 *
 * Canon: Identity flows through the system, not stored in fragments.
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user ?? null,
	};
};
