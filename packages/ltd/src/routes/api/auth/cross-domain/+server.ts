import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getSessionCookies } from '@create-something/components/auth';
import { identityClient, getIdentityErrorMessage } from '@create-something/components/api';
import { createLogger } from '@create-something/components/utils';

const logger = createLogger('CrossDomainAPI');

const TARGET_DOMAINS: Record<string, string> = {
	ltd: 'https://createsomething.ltd',
	io: 'https://createsomething.io',
	space: 'https://createsomething.space',
	agency: 'https://createsomething.agency',
	lms: 'https://learn.createsomething.space'
};

export const GET: RequestHandler = async ({ url, cookies }) => {
	const target = url.searchParams.get('target');
	const redirect = url.searchParams.get('redirect') || '/account';

	logger.info('Cross-domain request', { target, redirect });

	if (!target || !TARGET_DOMAINS[target]) {
		logger.warn('Invalid target', { target });
		return json({ error: 'Invalid target property' }, { status: 400 });
	}

	const session = getSessionCookies(cookies);
	if (!session.accessToken) {
		logger.warn('No access token');
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const result = await identityClient.generateCrossDomainToken({
		target,
		accessToken: session.accessToken
	});

	if (!result.success) {
		logger.warn('Token generation failed', { error: result.error });
		return json(
			{ error: getIdentityErrorMessage(result, 'Token generation failed') },
			{ status: result.status }
		);
	}

	const targetUrl = new URL('/auth/cross-domain', TARGET_DOMAINS[target]);
	targetUrl.searchParams.set('token', result.data.token);
	targetUrl.searchParams.set('redirect', redirect);

	logger.info('Redirecting to target', { target });

	return new Response(null, {
		status: 302,
		headers: { Location: targetUrl.toString() }
	});
};
