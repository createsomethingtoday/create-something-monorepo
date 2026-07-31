import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

import { lookupConfiguredNpgLocation } from '$lib/server/npg-location-directory';

export const POST: RequestHandler = async ({ request, platform }) => {
  let query = '';
  try {
    const body = (await request.json()) as { query?: unknown };
    if (typeof body.query === 'string') query = body.query.slice(0, 180);
  } catch {
    // The bounded lookup below returns the same caller-safe response for malformed input.
  }

  const platformEnv = platform?.env as Record<string, string | undefined> | undefined;
  const rawDirectory =
    platformEnv?.NPG_CALLER_SAFE_LOCATIONS_JSON ?? env.NPG_CALLER_SAFE_LOCATIONS_JSON;

  return Response.json(lookupConfiguredNpgLocation(query, rawDirectory), {
    headers: { 'Cache-Control': 'no-store, private', Pragma: 'no-cache' }
  });
};
