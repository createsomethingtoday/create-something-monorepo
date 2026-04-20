import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Auth callback page — legacy Auth0 route.
 *
 * Clerk does not use a server-side OAuth callback; session handling is
 * built into the Clerk JS SDK. Redirect any stale bookmarks to /login.
 */

export const load: PageServerLoad = async () => {
	throw redirect(302, '/login');
};
