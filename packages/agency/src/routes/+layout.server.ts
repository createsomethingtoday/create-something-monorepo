/**
 * Layout Server Loader - Agency
 *
 * Passes authenticated user and Clerk public config to the client.
 * Authentication is handled in hooks.server.ts via Clerk.
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, locals, platform }) => {
	return {
		pathname: url.pathname,
		user: locals.user ?? null,
		publicConfig: {
			clerkPublishableKey:
				(platform?.env as Record<string, string | undefined> | undefined)
					?.CLERK_PUBLISHABLE_KEY || null,
		},
	};
};
