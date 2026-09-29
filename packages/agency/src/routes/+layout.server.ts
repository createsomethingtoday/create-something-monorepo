/**
 * Layout Server Loader - Agency
 *
 * Uses shared loader from @create-something/canon/auth
 */

import { createLayoutServerLoader } from '@create-something/canon/auth';
import { building } from '$app/environment';
import type { LayoutServerLoad } from './$types';

const loadAgencySession = createLayoutServerLoader({ property: 'agency' });

export const load: LayoutServerLoad = async (event) => {
  // Workflow guides are prerendered and cannot read Cloudflare's runtime env.
  if (building || event.route.id === '/workflows/[slug]') {
    return { pathname: event.url.pathname, user: undefined };
  }

  return loadAgencySession({
    url: event.url,
    cookies: event.cookies,
    platform: event.platform ? { env: { ENVIRONMENT: event.platform.env.ENVIRONMENT } } : undefined
  });
};
