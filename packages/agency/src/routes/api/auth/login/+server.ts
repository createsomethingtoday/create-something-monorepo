import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const signInUrl = new URL('/sign-in', url);
	const redirectTo = url.searchParams.get('redirect_url') ?? url.searchParams.get('redirect');

	if (redirectTo) {
		signInUrl.searchParams.set('redirect_url', redirectTo);
	}

	redirect(302, signInUrl.toString());
};

export const POST: RequestHandler = async () => {
	return json(
		{ error: 'Email/password login has been replaced by Clerk. Use GET /sign-in.' },
		{ status: 405 }
	);
};
