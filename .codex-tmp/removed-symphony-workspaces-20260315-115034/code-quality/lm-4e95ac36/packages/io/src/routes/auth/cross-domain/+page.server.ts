/**
 * Cross-Domain Token Exchange
 * 
 * Uses shared loader from @create-something/canon/auth
 */

import { createCrossDomainPageLoader } from '@create-something/canon/auth';

export const load = createCrossDomainPageLoader({ property: 'io' });
