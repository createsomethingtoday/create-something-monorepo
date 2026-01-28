/**
 * Magic Link Callback
 * 
 * Uses shared loader from @create-something/canon/auth
 */

import { createMagicLinkCallbackLoader } from '@create-something/canon/auth';
import { identityClient } from '@create-something/canon/api';

export const load = createMagicLinkCallbackLoader({
	property: 'agency',
	identityClient
});
