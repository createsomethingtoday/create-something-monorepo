import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { clearSessionCookies } from '@create-something/components/auth';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	const isProduction = platform?.env?.ENVIRONMENT === 'production';
	const domain = isProduction ? '.createsomething.space' : undefined;

	// Clear session cookies
	clearSessionCookies(cookies, isProduction, domain);

	return json({ success: true });
};
