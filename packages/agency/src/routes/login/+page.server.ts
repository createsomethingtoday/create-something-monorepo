/**
 * Login Page Loader - Agency
 *
 * Uses shared loader from @create-something/components/auth
 */

import { createLoginPageLoader } from '@create-something/components/auth';

export const load = createLoginPageLoader({ property: 'agency' });
