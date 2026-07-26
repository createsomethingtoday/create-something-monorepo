import type { Handle } from '@sveltejs/kit';
import { autoRefreshMiddleware } from '@create-something/canon/auth';
import { runtimeEnv } from '$lib/server/access.js';

export const handle: Handle = async ({ event, resolve }) => {
  const env = runtimeEnv(event.platform);
  await autoRefreshMiddleware(event.cookies, {
    isProduction: env.ENVIRONMENT === 'production',
    identityEndpoint: env.IDENTITY_API_URL || env.CS_IDENTITY_ISSUER
  });
  return resolve(event);
};
