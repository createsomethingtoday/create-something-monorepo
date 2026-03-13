import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';

export const GET: RequestHandler = async ({ platform, url }) => {
	const clientId = platform?.env?.LINKEDIN_CLIENT_ID;

	if (!clientId) {
		return new Response('LinkedIn client ID not configured', { status: 500 });
	}

	// Generate state for CSRF protection
	const state = crypto.randomUUID();

	// Store state in KV with 10 minute expiration
	const sessions = platform?.env?.SESSIONS;
	if (sessions) {
		await sessions.put(`linkedin_state:${state}`, 'valid', { expirationTtl: 600 });
	}

	const redirectUri = `${url.origin}/api/linkedin/callback`;

	// Scopes:
	// - openid, profile, email: User identity
	// - w_member_social: Post as personal account
	// Note: Organization scopes (r_organization_social, w_organization_social) require
	// LinkedIn Marketing Developer Platform approval. Add them once approved.
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		redirect_uri: redirectUri,
		state: state,
		scope: 'openid profile email w_member_social'
	});

	throw redirect(302, `${LINKEDIN_AUTH_URL}?${params.toString()}`);
};
