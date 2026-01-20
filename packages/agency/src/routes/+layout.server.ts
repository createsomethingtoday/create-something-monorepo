/**
 * Layout Server Loader - Agency
 *
 * Uses shared loader from @create-something/components/auth
 */

import { createLayoutServerLoader } from '@create-something/components/auth';

export const load = createLayoutServerLoader({ property: 'agency' });
