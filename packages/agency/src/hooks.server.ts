import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createAuthHooks } from '@create-something/canon/auth';
import { abundanceApiAuthHandle } from './lib/server/abundance-api-auth';

/**
 * Redirects for deprecated routes (post-MCP pivot)
 */
const deprecatedRedirects: Record<string, string> = {
	'/categories': '/services',
	'/category': '/services',
	'/work': '/',
	'/discover': '/'
};

const redirectHandle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	// Check exact matches first
	if (deprecatedRedirects[path]) {
		throw redirect(301, deprecatedRedirects[path]);
	}

	// Check prefix matches for nested routes
	for (const [prefix, target] of Object.entries(deprecatedRedirects)) {
		if (path.startsWith(prefix + '/')) {
			throw redirect(301, target);
		}
	}

	return resolve(event);
};

const authHandle = createAuthHooks({
	protectedPaths: ['/account', '/dashboard', '/admin', '/mcp-access'],
	loginPath: '/login',
	includeRedirect: true,
}) as Handle;

export const handle = sequence(redirectHandle, authHandle, abundanceApiAuthHandle);
