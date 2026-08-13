import type { RequestHandler } from './$types';

const identityAuthorizationServerMetadata =
	'https://id.createsomething.space/.well-known/oauth-authorization-server';

/**
 * Resource-level convenience entrypoint for discovery clients that probe the
 * public site before reading its RFC 9728 protected-resource metadata. The
 * first-party Identity Worker remains the sole authorization-server issuer.
 */
export const GET: RequestHandler = async () =>
	new Response(null, {
		status: 308,
		headers: {
			location: identityAuthorizationServerMetadata,
			'cache-control': 'public, max-age=300'
		}
	});
