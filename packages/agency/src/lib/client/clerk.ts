/**
 * Clerk Browser Client
 *
 * Lazy-loads @clerk/clerk-js and caches the instance.
 * Used by ClerkMount.svelte and SignOutButton.
 */

import type { Clerk as ClerkInstance } from '@clerk/clerk-js';

let clerkPromise: Promise<ClerkInstance> | null = null;
let cachedPublishableKey: string | null = null;

export async function loadBrowserClerk(
	publishableKey: string | null | undefined,
): Promise<ClerkInstance> {
	if (!publishableKey) {
		throw new Error('CLERK_PUBLISHABLE_KEY is not configured');
	}

	if (!clerkPromise || cachedPublishableKey !== publishableKey) {
		cachedPublishableKey = publishableKey;
		clerkPromise = (async () => {
			const { Clerk } = await import('@clerk/clerk-js');
			const clerk = new Clerk(publishableKey);
			await clerk.load();
			return clerk;
		})();
	}

	return clerkPromise;
}
