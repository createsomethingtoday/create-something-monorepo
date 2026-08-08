import type { RequestHandler } from './$types';
import { authenticateProjectPassword, runtimeEnv } from '$lib/server/access.js';

export const POST: RequestHandler = ({ request, platform }) => authenticateProjectPassword({
  request,
  env: runtimeEnv(platform)
});
