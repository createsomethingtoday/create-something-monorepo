import type { RequestHandler } from './$types';

const protectedResourceMetadata = {
	resource: 'https://createsomething.agency',
	authorization_servers: ['https://id.createsomething.space'],
	scopes_supported: ['openid', 'profile', 'email', 'mcp'],
	bearer_methods_supported: ['header']
} as const;

/** RFC 9728 metadata for the one public OAuth-protected agent discovery route. */
export const GET: RequestHandler = async () =>
	Response.json(protectedResourceMetadata, {
		headers: { 'cache-control': 'public, max-age=300' }
	});
