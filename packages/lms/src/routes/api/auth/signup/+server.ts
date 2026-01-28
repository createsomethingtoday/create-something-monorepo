/**
 * Signup API Route
 *
 * Uses shared handler from @create-something/canon/auth
 *
 * Canon: Creation begins with a single step.
 */

import { createSignupHandler } from '@create-something/canon/auth';

export const POST = createSignupHandler({
	source: 'lms'
});
