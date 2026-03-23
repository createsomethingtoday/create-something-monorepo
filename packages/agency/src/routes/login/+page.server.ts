import { redirect } from '@sveltejs/kit';
import { createSessionManager, getAuth0Config, PROPERTY_DOMAINS } from '@create-something/canon/auth';

const DEFAULT_REDIRECT = '/dashboard';

export const load = async ({ url, cookies, platform }: { url: URL; cookies: import('@sveltejs/kit').Cookies; platform: App.Platform }) => {
	const authProvider = getAuth0Config(platform?.env);
	const session = createSessionManager(cookies, {
		isProduction: platform?.env?.ENVIRONMENT === 'production',
		domain: PROPERTY_DOMAINS.agency,
		authProvider: authProvider ?? undefined,
	});

	const user = await session.getUser();
	const redirectTo = url.searchParams.get('redirect') || DEFAULT_REDIRECT;

	if (user) {
		throw redirect(302, redirectTo);
	}

	return {
		redirectTo,
		error: url.searchParams.get('error') || null,
	};
};
