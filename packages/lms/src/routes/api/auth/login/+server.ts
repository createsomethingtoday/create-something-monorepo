/**
 * Login API Route
 *
 * Uses shared handler from @create-something/components/auth
 *
 * Canon: The infrastructure disappears; only the unified self remains.
 */

import { createLoginHandler } from '@create-something/components/auth';

export const POST = createLoginHandler({
	cookieDomain: '.createsomething.space'
});
