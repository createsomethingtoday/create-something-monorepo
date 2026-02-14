import { redirect, type Handle } from '@sveltejs/kit';

/**
 * Redirects for deprecated routes (post-MCP pivot)
 */
const deprecatedRedirects: Record<string, string> = {
	'/categories': '/services',
	'/category': '/services',
	'/work': '/',
	'/discover': '/'
};

export const handle: Handle = async ({ event, resolve }) => {
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
