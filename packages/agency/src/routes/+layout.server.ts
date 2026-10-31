/**
 * Layout Server Loader - Agency
 *
 * Uses the identity verified by the server hook.
 */

import { building } from '$app/environment';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  // Public prerendered routes cannot read Cloudflare runtime bindings.
  if (building || event.route.id === '/workflows/[slug]' || event.route.id === '/scopefield') {
    return { pathname: event.url.pathname, user: undefined };
  }

  // The hook already verified this identity with the application's exact runtime policy.
  return { pathname: event.url.pathname, user: event.locals.user };
};
