import { handleLogout } from '@create-something/canon/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	return handleLogout(
		request,
		cookies,
		platform
			? {
					env: platform.env as unknown as Record<string, unknown> & {
						ENVIRONMENT?: string | undefined;
					}
				}
			: undefined
	);
};
