/**
 * Cross-Domain Auth API
 * 
 * Uses shared handler from @create-something/components/auth
 */

import { createCrossDomainHandler } from '@create-something/components/auth';
import { identityClient, getIdentityErrorMessage } from '@create-something/components/api';

export const GET = createCrossDomainHandler({
	identityClient,
	getIdentityErrorMessage
});
