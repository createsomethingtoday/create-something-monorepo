/**
 * Twitter/X OAuth 2.0 Authorization
 *
 * Redirects to Twitter for OAuth authorization.
 * Uses PKCE flow (required by Twitter v2 API).
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

// Scopes needed for social agent
const SCOPES = [
	'tweet.read',
	'tweet.write',
	'users.read',
	'offline.access' // For refresh tokens
].join(' ');

export const GET: RequestHandler = async ({ platform, url }) => {
	const clientId = platform?.env?.TWITTER_CLIENT_ID;

	if (!clientId) {
		return new Response('Twitter client ID not configured', { status: 500 });
	}

	// Generate PKCE challenge
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = await generateCodeChallenge(codeVerifier);

	// Generate state for CSRF protection
	const state = crypto.randomUUID();

	// Store state and verifier in KV with 10 minute expiration
	const sessions = platform?.env?.SESSIONS;
	if (sessions) {
		await sessions.put(
			`twitter_auth:${state}`,
			JSON.stringify({ codeVerifier }),
			{ expirationTtl: 600 }
		);
	}

	const redirectUri = `${url.origin}/api/twitter/callback`;

	const params = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: SCOPES,
		state: state,
		code_challenge: codeChallenge,
		code_challenge_method: 'S256'
	});

	throw redirect(302, `${TWITTER_AUTH_URL}?${params.toString()}`);
};

/**
 * Generate a random code verifier for PKCE
 */
function generateCodeVerifier(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encode (no padding, URL-safe chars)
 */
function base64UrlEncode(buffer: Uint8Array): string {
	let binary = '';
	for (const byte of buffer) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}
