/**
 * Are.na OAuth Authorization Redirect
 *
 * Redirects users to Are.na to authorize the CREATE SOMETHING app.
 * After authorization, Are.na redirects back to /api/arena/callback.
 */

import { redirect, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const clientId = platform?.env?.ARENA_CLIENT_ID;

	if (!clientId) {
		return json(
			{
				error: 'OAuth not configured',
				message: 'ARENA_CLIENT_ID must be set',
				hint: 'Run: wrangler pages secret put ARENA_CLIENT_ID --project-name=createsomething-ltd'
			},
			{ status: 500 }
		);
	}

	const redirectUri = 'https://createsomething.ltd/api/arena/callback';

	const authorizeUrl = new URL('https://dev.are.na/oauth/authorize');
	authorizeUrl.searchParams.set('client_id', clientId);
	authorizeUrl.searchParams.set('redirect_uri', redirectUri);
	authorizeUrl.searchParams.set('response_type', 'code');

	return redirect(302, authorizeUrl.toString());
};
