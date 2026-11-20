/** Operator-only, proposal-only Are.na v3 Premium discovery. */
import { getTokenFromRequest } from '@create-something/canon/auth/server';
import { verifyLtdIdentityToken } from '$lib/server/identity';
import { discoverTasteCandidates } from '$lib/taste/discovery';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request, platform, url }) =>
	discoverTasteCandidates(
		{
			url,
			token: getTokenFromRequest(request),
			allowedEmails: platform?.env?.TASTE_DISCOVERY_ALLOWED_EMAILS,
			accessToken: platform?.env?.ARENA_API_TOKEN
		},
		{ verify: verifyLtdIdentityToken }
	);
