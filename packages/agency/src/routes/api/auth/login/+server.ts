import { redirect, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Login API endpoint.
 *
 * With Clerk, the sign-in UI is rendered client-side via ClerkMount.
 * GET requests redirect to /login; POST returns a 405 explaining the change.
 */

export const GET: RequestHandler = async ({ url }) => {
	const redirectTo = url.searchParams.get('redirect') || '/';
	redirect(302, `/login?redirect=${encodeURIComponent(redirectTo)}`);
};

export const POST: RequestHandler = async () => {
	return json(
		{ error: 'Email/password login has been replaced by Clerk. Navigate to /login.' },
		{ status: 405 },
	);
};
