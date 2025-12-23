import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearSessionCookies, getRefreshTokenFromRequest, revokeSession } from '@create-something/components/auth';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? '.createsomething.ltd' : undefined;

		const refreshToken = getRefreshTokenFromRequest(request);
		if (refreshToken) {
			await revokeSession(refreshToken);
		}

		clearSessionCookies(cookies, isProduction ?? true, domain);

		return json({ success: true });
	} catch (error) {
		console.error('Logout error:', error);
		return json({ error: 'Logout failed' }, { status: 500 });
	}
};
