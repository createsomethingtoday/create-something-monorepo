/**
 * Twitter/X OAuth 2.0 Callback
 *
 * Handles the OAuth callback from Twitter and exchanges the code for tokens.
 */

import { redirect, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	// Handle errors from Twitter
	if (error) {
		const description = url.searchParams.get('error_description') || error;
		return new Response(`Twitter authorization failed: ${description}`, { status: 400 });
	}

	if (!code || !state) {
		return new Response('Missing code or state parameter', { status: 400 });
	}

	const sessions = platform?.env?.SESSIONS;
	const clientId = platform?.env?.TWITTER_CLIENT_ID;
	const clientSecret = platform?.env?.TWITTER_CLIENT_SECRET;

	if (!sessions || !clientId) {
		return new Response('Server configuration error', { status: 500 });
	}

	// Retrieve and validate state
	const authDataRaw = await sessions.get(`twitter_auth:${state}`);
	if (!authDataRaw) {
		return new Response('Invalid or expired state. Please try again.', { status: 400 });
	}

	const authData = JSON.parse(authDataRaw) as { codeVerifier: string };

	// Clean up state
	await sessions.delete(`twitter_auth:${state}`);

	const redirectUri = `${url.origin}/api/twitter/callback`;

	// Exchange code for tokens
	try {
		const params = new URLSearchParams({
			code,
			grant_type: 'authorization_code',
			client_id: clientId,
			redirect_uri: redirectUri,
			code_verifier: authData.codeVerifier
		});

		const headers: Record<string, string> = {
			'Content-Type': 'application/x-www-form-urlencoded'
		};

		// Use Basic auth if client secret is available
		if (clientSecret) {
			const credentials = btoa(`${clientId}:${clientSecret}`);
			headers.Authorization = `Basic ${credentials}`;
		}

		const tokenResponse = await fetch(TOKEN_URL, {
			method: 'POST',
			headers,
			body: params.toString()
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error('[Twitter OAuth] Token exchange failed:', errorText);
			return new Response(`Failed to exchange code for token: ${errorText}`, { status: 500 });
		}

		const tokens = (await tokenResponse.json()) as TokenResponse;

		// Store tokens in KV
		const tokenData = {
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token,
			expires_at: Date.now() + tokens.expires_in * 1000,
			scope: tokens.scope
		};

		await sessions.put('twitter_access_token', JSON.stringify(tokenData));

		console.log('[Twitter OAuth] Successfully connected');

		// Redirect to success page
		throw redirect(302, '/admin/social?twitter=connected');
	} catch (err) {
		if (err instanceof Response) throw err;
		if ((err as { status?: number })?.status === 302) throw err;

		console.error('[Twitter OAuth] Error:', err);
		return new Response(
			`OAuth callback error: ${err instanceof Error ? err.message : 'Unknown error'}`,
			{ status: 500 }
		);
	}
};
