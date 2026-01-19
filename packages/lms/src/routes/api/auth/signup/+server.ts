/**
 * Signup API Route
 *
 * Uses shared handler from @create-something/components/auth
 *
 * Canon: Creation begins with a single step.
 */

import { createSignupHandler } from '@create-something/components/auth';

export const POST = createSignupHandler({
	source: 'lms'
});
