import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyIdentityToken } from '@create-something/canon/auth/server';

const resource = 'https://createsomething.agency';
const metadataUrl = `${resource}/.well-known/oauth-protected-resource`;
const defaultIssuer = 'https://id.createsomething.space';

function scopeIncludes(scope: unknown, expected: string): boolean {
	return typeof scope === 'string' && scope.split(/\s+/).includes(expected);
}

function discoveryChallenge(): string {
	return `Bearer resource_metadata="${metadataUrl}"`;
}

/**
 * A small, read-only resource that proves the advertised OAuth flow works.
 * It deliberately returns discovery pointers rather than customer data or
 * execution controls.
 */
export const GET: RequestHandler = async ({ request, platform, fetch }) => {
	const authorization = request.headers.get('authorization');
	const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
	if (!token) {
		return json(
			{ error: 'oauth_required', resource_metadata: metadataUrl },
			{ status: 401, headers: { 'www-authenticate': discoveryChallenge(), 'cache-control': 'no-store' } }
		);
	}

	const issuer = (platform?.env?.CS_IDENTITY_ISSUER || defaultIssuer).replace(/\/+$/, '');
	const identity = await verifyIdentityToken(token, {
		issuer,
		jwksUrl: platform?.env?.CS_IDENTITY_JWKS_URL || `${issuer}/.well-known/jwks.json`,
		audience: resource,
		fetch
	});
	const claims = identity?.claims as Record<string, unknown> | undefined;
	const acceptedTokenKinds = new Set(['oauth_access_token', 'agent_auth_access_token']);
	if (!identity || !acceptedTokenKinds.has(String(claims?.kind)) || !scopeIncludes(claims.scope, 'mcp')) {
		return json(
			{ error: 'invalid_or_insufficient_token', resource_metadata: metadataUrl },
			{ status: 401, headers: { 'www-authenticate': discoveryChallenge(), 'cache-control': 'no-store' } }
		);
	}

	return json(
		{
			authenticated: true,
			resource,
			subject: identity.subject,
			allowed: ['read_agent_discovery'],
			discovery: {
				api_catalog: `${resource}/.well-known/api-catalog`,
				agent_card: `${resource}/.well-known/agent-card.json`,
				mcp_server_card: `${resource}/.well-known/mcp/server-card.json`,
				skills_index: `${resource}/.well-known/agent-skills/index.json`
			},
			boundary: 'This resource does not authorize purchases, credential issuance, or external writes.'
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};
