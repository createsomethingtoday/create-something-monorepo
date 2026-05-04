import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import {
	authenticateClerkRequest,
	getClerkClient,
	getPrimaryEmail,
	resolveClerkEnv,
} from '$lib/server/clerk';

// ---------------------------------------------------------------------------
// Deprecated route redirects (post-MCP pivot)
// ---------------------------------------------------------------------------

const deprecatedRedirects: Record<string, string> = {
	'/categories': '/services',
	'/category': '/services',
	'/work': '/',
	'/discover': '/',
};

const redirectHandle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	if (deprecatedRedirects[path]) {
		throw redirect(301, deprecatedRedirects[path]);
	}

	for (const [prefix, target] of Object.entries(deprecatedRedirects)) {
		if (path.startsWith(prefix + '/')) {
			throw redirect(301, target);
		}
	}

	return resolve(event);
};

// ---------------------------------------------------------------------------
// Clerk authentication hook
// ---------------------------------------------------------------------------

const PROTECTED_PATHS = ['/account', '/dashboard', '/admin', '/mcp-access'];
const LOGIN_PATH = '/login';

const clerkAuthHandle: Handle = async ({ event, resolve }) => {
	const clerkEnv = resolveClerkEnv(
		event.platform?.env as Record<string, unknown> | undefined,
	);

	// Authenticate the request via Clerk
	const auth = await authenticateClerkRequest(event.request, clerkEnv);
	event.locals.auth = auth;
	event.locals.user = undefined;

	// Hydrate user from Clerk if authenticated
	if (auth.userId) {
		try {
			const clerkClient = getClerkClient(clerkEnv);
			const clerkUser = await clerkClient.users.getUser(auth.userId);
			const email = getPrimaryEmail(clerkUser);

			if (email) {
				event.locals.user = {
					id: auth.userId,
					email,
					tier: 'free',
					source: 'clerk',
				};
			}
		} catch (error) {
			console.error('Failed to hydrate Clerk user', error);
		}
	}

	// Protect routes
	const isProtected = PROTECTED_PATHS.some((p) =>
		event.url.pathname.startsWith(p),
	);

	if (isProtected && !event.locals.user) {
		const redirectParam = `?redirect=${encodeURIComponent(event.url.pathname)}`;
		throw redirect(302, `${LOGIN_PATH}${redirectParam}`);
	}

	return resolve(event);
};

export const handle = sequence(redirectHandle, clerkAuthHandle);
