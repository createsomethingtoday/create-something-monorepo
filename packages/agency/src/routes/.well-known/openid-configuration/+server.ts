import type { RequestHandler } from './$types';

const identityOpenIdConfiguration = 'https://id.createsomething.space/.well-known/openid-configuration';

/** See the OAuth authorization-server discovery redirect beside this route. */
export const GET: RequestHandler = async () =>
	new Response(null, {
		status: 308,
		headers: {
			location: identityOpenIdConfiguration,
			'cache-control': 'public, max-age=300'
		}
	});
