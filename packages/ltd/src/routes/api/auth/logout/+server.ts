import { handleLogout } from '@create-something/components/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	return handleLogout(request, cookies, platform);
};
