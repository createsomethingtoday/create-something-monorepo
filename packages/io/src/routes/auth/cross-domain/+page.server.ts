/**
 * Cross-Domain Token Exchange
 * 
 * Uses shared loader from @create-something/components/auth
 */

import { createCrossDomainPageLoader } from '@create-something/components/auth';

export const load = createCrossDomainPageLoader({ property: 'io' });
