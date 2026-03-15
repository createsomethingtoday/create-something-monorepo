/**
 * Progress Page Server
 *
 * Minimal server-side data loading. The client-side store handles progress fetching.
 * Canon: The server authenticates; the client manages state.
 */

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Check authentication via locals (set by hooks)
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login?redirect=/progress');
	}

	// Return minimal data - the store will fetch progress on mount
	return {
		user: {
			id: user.id,
			email: user.email,
			name: user.name
		}
	};
};
