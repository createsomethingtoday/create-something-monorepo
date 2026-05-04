/**
 * Layout Server Loader - Agency
 *
 * Passes authenticated user and Clerk public config to the client.
 * Authentication is handled in hooks.server.ts via Clerk.
 */

import type { LayoutServerLoad } from './$types';
import { resolveClerkPublishableKey } from '$lib/server/clerk';

export const load: LayoutServerLoad = async ({ url, locals, platform }) => {
	const env = platform?.env as Record<string, unknown> | undefined;

	return {
		pathname: url.pathname,
		user: locals.user ?? null,
		publicConfig: {
			clerkPublishableKey: resolveClerkPublishableKey(env) ?? null,
		},
	};
};
