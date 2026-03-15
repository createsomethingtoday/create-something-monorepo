/**
 * Cross-Domain Auth API
 * 
 * Uses shared handler from @create-something/canon/auth
 */

import { createCrossDomainHandler } from '@create-something/canon/auth';
import { identityClient, getIdentityErrorMessage } from '@create-something/canon/api';

export const GET = createCrossDomainHandler({
	identityClient,
	getIdentityErrorMessage
});
