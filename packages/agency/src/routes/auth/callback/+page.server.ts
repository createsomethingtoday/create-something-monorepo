/**
 * Magic Link Callback
 * 
 * Uses shared loader from @create-something/components/auth
 */

import { createMagicLinkCallbackLoader } from '@create-something/components/auth';
import { identityClient } from '@create-something/components/api';

export const load = createMagicLinkCallbackLoader({
	property: 'agency',
	identityClient
});
