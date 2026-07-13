import { redirect } from '@sveltejs/kit';
import { clearSessionCookies } from '@create-something/canon/auth/cookies';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, platform }) => {
  clearSessionCookies(cookies, platform?.env?.ENVIRONMENT === 'production');
  redirect(303, '/');
};
