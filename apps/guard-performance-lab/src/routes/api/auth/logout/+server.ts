import { redirect } from '@sveltejs/kit';
import { handleLogout } from '@create-something/canon/auth';
import { runtimeEnv } from '$lib/server/access.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, cookies, platform }) => {
  const env = runtimeEnv(platform);
  await handleLogout(request, cookies, platform, {
    identityEndpoint: env.IDENTITY_API_URL || env.CS_IDENTITY_ISSUER
  });
  redirect(303, '/');
};
