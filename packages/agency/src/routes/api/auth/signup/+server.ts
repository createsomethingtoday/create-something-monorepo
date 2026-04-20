import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Signup API endpoint.
 *
 * With Clerk, the sign-up UI is rendered client-side.
 * This redirect preserves backwards-compatible URLs.
 */

export const GET: RequestHandler = async ({ url }) => {
	const redirectTo = url.searchParams.get('redirect') || '/';
	redirect(302, `/signup?redirect=${encodeURIComponent(redirectTo)}`);
};
