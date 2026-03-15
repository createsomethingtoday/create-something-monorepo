/**
 * Login Page Loader - LTD
 *
 * Uses shared loader from @create-something/canon/auth
 */

import { createLoginPageLoader } from '@create-something/canon/auth';

export const load = createLoginPageLoader({ property: 'ltd' });
