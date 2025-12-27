import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

interface TokenResponse {
	access_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
	id_token?: string;
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');
	const errorDescription = url.searchParams.get('error_description');

	// Handle OAuth errors
	if (error) {
		console.error('LinkedIn OAuth error:', error, errorDescription);
		return new Response(
			`<html><body>
				<h1>LinkedIn Authorization Failed</h1>
				<p>${errorDescription || error}</p>
				<a href="/">Return home</a>
			</body></html>`,
			{ status: 400, headers: { 'Content-Type': 'text/html' } }
		);
	}

	if (!code || !state) {
		return new Response('Missing code or state parameter', { status: 400 });
	}

	const sessions = platform?.env?.SESSIONS;
	const clientId = platform?.env?.LINKEDIN_CLIENT_ID;
	const clientSecret = platform?.env?.LINKEDIN_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		return new Response('LinkedIn credentials not configured', { status: 500 });
	}

	// Validate state (CSRF protection)
	if (sessions) {
		const storedState = await sessions.get(`linkedin_state:${state}`);
		if (!storedState) {
			return new Response('Invalid or expired state parameter', { status: 400 });
		}
		// Clean up used state
		await sessions.delete(`linkedin_state:${state}`);
	}

	const redirectUri = `${url.origin}/api/linkedin/callback`;

	// Exchange code for access token
	try {
		const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				code: code,
				redirect_uri: redirectUri,
				client_id: clientId,
				client_secret: clientSecret
			})
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error('Token exchange failed:', errorText);
			return new Response(`Token exchange failed: ${errorText}`, { status: 400 });
		}

		const tokens = (await tokenResponse.json()) as TokenResponse;

		// Store access token in KV (expires in ~60 days typically)
		if (sessions) {
			await sessions.put(
				'linkedin_access_token',
				JSON.stringify({
					access_token: tokens.access_token,
					expires_at: Date.now() + tokens.expires_in * 1000,
					scope: tokens.scope
				}),
				{ expirationTtl: tokens.expires_in }
			);
		}

		// Success page
		return new Response(
			`<html><body style="font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px;">
				<h1>LinkedIn Connected</h1>
				<p>Access token stored successfully. Expires in ${Math.floor(tokens.expires_in / 86400)} days.</p>
				<p>Scope: ${tokens.scope}</p>
				<h2>Test Post</h2>
				<p>You can now post to LinkedIn using:</p>
				<pre style="background: #1a1a1a; color: #fff; padding: 16px; border-radius: 8px; overflow-x: auto;">curl -X POST ${url.origin}/api/linkedin/post \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Test post from CREATE SOMETHING"}'</pre>
				<p><a href="/">Return home</a></p>
			</body></html>`,
			{ status: 200, headers: { 'Content-Type': 'text/html' } }
		);
	} catch (err) {
		console.error('Token exchange error:', err);
		return new Response(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, {
			status: 500
		});
	}
};
