import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const redirectTo = url.searchParams.get('redirect') || '/';
	redirect(302, `/api/auth/login?screen_hint=signup&redirect=${encodeURIComponent(redirectTo)}`);
};
