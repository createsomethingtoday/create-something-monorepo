import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthorizationUrl, generateState, storeOAuthState } from '$lib/notion/oauth';

export const GET: RequestHandler = async ({ platform, url }) => {
	if (!platform?.env?.NOTION_CLIENT_ID || !platform?.env?.KV) {
		throw new Error('Missing required environment variables');
	}

	const redirectUri = `${url.origin}/auth/callback`;

	const state = generateState();

	// Store state in KV for validation
	await storeOAuthState(platform.env.KV, state, {
		redirectUri,
		timestamp: Date.now()
	});

	const authUrl = getAuthorizationUrl({
		clientId: platform.env.NOTION_CLIENT_ID,
		clientSecret: '', // Not needed for auth URL
		redirectUri
	}, state);

	throw redirect(302, authUrl);
};
