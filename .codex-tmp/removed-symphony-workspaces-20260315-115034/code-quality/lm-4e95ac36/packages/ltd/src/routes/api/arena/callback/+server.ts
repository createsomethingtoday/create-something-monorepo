/**
 * Are.na OAuth Callback
 *
 * Handles the OAuth authorization code exchange.
 * After user authorizes at Are.na, they're redirected here with a code.
 * We exchange the code for an access token.
 *
 * Flow:
 * 1. User visits /api/arena/authorize (redirects to Are.na)
 * 2. User authorizes the app
 * 3. Are.na redirects to /api/arena/callback?code=XXX
 * 4. We exchange code for access_token
 * 5. Store token in KV and redirect to /taste
 */

import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: null;
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');

	// Handle errors from Are.na
	if (error) {
		return json(
			{
				error: 'Authorization denied',
				message: url.searchParams.get('error_description') || error
			},
			{ status: 400 }
		);
	}

	if (!code) {
		return json(
			{
				error: 'Missing authorization code',
				message: 'No code parameter received from Are.na'
			},
			{ status: 400 }
		);
	}

	// Get OAuth credentials from environment
	const clientId = platform?.env?.ARENA_CLIENT_ID;
	const clientSecret = platform?.env?.ARENA_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		return json(
			{
				error: 'OAuth not configured',
				message: 'ARENA_CLIENT_ID and ARENA_CLIENT_SECRET must be set'
			},
			{ status: 500 }
		);
	}

	const redirectUri = 'https://createsomething.ltd/api/arena/callback';

	try {
		// Exchange code for access token
		const tokenResponse = await fetch('https://dev.are.na/oauth/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				code,
				grant_type: 'authorization_code',
				redirect_uri: redirectUri
			})
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error('Token exchange failed:', errorText);
			return json(
				{
					error: 'Token exchange failed',
					message: `Are.na returned ${tokenResponse.status}`,
					details: errorText
				},
				{ status: 400 }
			);
		}

		const tokenData: TokenResponse = await tokenResponse.json();

		// Store the access token in KV for server-side use
		const cache = platform?.env?.CACHE;
		if (cache) {
			await cache.put('arena:access_token', tokenData.access_token, {
				// No expiration - Are.na tokens don't expire
			});
		}

		// Also store as the primary API token for channel operations
		// Note: For production, you'd want to use wrangler secret put ARENA_API_TOKEN
		// This KV storage is a fallback/convenience

		// Redirect to taste page with success message
		return redirect(302, '/taste?arena_auth=success');
	} catch (error) {
		console.error('OAuth callback error:', error);
		return json(
			{
				error: 'OAuth exchange failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
