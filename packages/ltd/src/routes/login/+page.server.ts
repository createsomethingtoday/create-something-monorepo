import { redirect } from '@sveltejs/kit';
import { createSessionManager, getAuth0Config } from '@create-something/canon/auth';
import type { PageServerLoad } from './$types';
import { safeCanonReturnPath } from './return-path';

export const load: PageServerLoad = async ({ url, cookies, platform }) => {
	const redirectTo = safeCanonReturnPath(url.searchParams.get('redirect'));
	const authProvider = getAuth0Config(
		platform?.env as Parameters<typeof getAuth0Config>[0]
	);
	const session = createSessionManager(cookies, {
		isProduction: platform?.env?.ENVIRONMENT === 'production',
		domain: '.createsomething.ltd',
		authProvider: authProvider ?? undefined,
	});

	if (await session.getUser()) throw redirect(302, redirectTo);

	return {
		redirectTo,
		error: url.searchParams.get('error'),
	};
};
