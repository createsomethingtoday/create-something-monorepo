/**
 * Login Page Loader - Agency
 *
 * Uses shared loader from @create-something/canon/auth
 */

import { createLoginPageLoader } from '@create-something/canon/auth';

export const load = createLoginPageLoader({ property: 'agency' });
