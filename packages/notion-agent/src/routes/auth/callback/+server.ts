import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCodeForToken, validateOAuthState, encryptToken } from '$lib/notion/oauth';
import { getUserByWorkspaceId, createUser, updateUserToken } from '$lib/db/queries';

export const GET: RequestHandler = async ({ platform, url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const errorParam = url.searchParams.get('error');

	// Check for OAuth errors
	if (errorParam) {
		throw error(400, `Notion OAuth error: ${errorParam}`);
	}

	if (!code || !state) {
		throw error(400, 'Missing code or state parameter');
	}

	if (!platform?.env?.KV || !platform?.env?.DB || !platform?.env?.NOTION_CLIENT_ID || !platform?.env?.NOTION_CLIENT_SECRET || !platform?.env?.ENCRYPTION_KEY) {
		throw error(500, 'Missing required environment configuration');
	}

	// Validate state
	const stateData = await validateOAuthState(platform.env.KV, state);
	if (!stateData) {
		throw error(400, 'Invalid or expired state parameter');
	}

	const redirectUri = stateData.redirectUri as string;

	try {
		// Exchange code for token
		const tokenResponse = await exchangeCodeForToken({
			clientId: platform.env.NOTION_CLIENT_ID,
			clientSecret: platform.env.NOTION_CLIENT_SECRET,
			redirectUri
		}, code);

		// Encrypt the access token before storing
		const encryptedToken = encryptToken(
			tokenResponse.access_token,
			platform.env.ENCRYPTION_KEY
		);

		// Check if user already exists
		const existingUser = await getUserByWorkspaceId(
			platform.env.DB,
			tokenResponse.workspace_id
		);

		let userId: string;

		if (existingUser) {
			// Update token for existing user
			await updateUserToken(platform.env.DB, existingUser.id, encryptedToken);
			userId = existingUser.id;
		} else {
			// Create new user
			userId = crypto.randomUUID();
			await createUser(platform.env.DB, {
				id: userId,
				notion_workspace_id: tokenResponse.workspace_id,
				notion_workspace_name: tokenResponse.workspace_name || 'Unknown',
				notion_access_token: encryptedToken,
				notion_bot_id: tokenResponse.bot_id
			});
		}

		// Set user cookie
		cookies.set('user_id', userId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		// Redirect to dashboard
		throw redirect(302, '/dashboard');
	} catch (err) {
		// SvelteKit redirects have status and location properties
		if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
			throw err; // Re-throw redirects
		}
		console.error('OAuth callback error:', err);
		throw error(500, `Failed to complete OAuth: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
