import { redirect, type Handle } from '@sveltejs/kit';
import { dashboardAccessKey } from '$lib/server/access';

/**
 * Shared-secret access gate. The data is internal: every route requires the
 * `dash_key` cookie to equal the dashboard access deploy secret.
 * Unauthenticated requests are sent to the key-entry form at /unlock.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const { pathname, search } = event.url;

  if (pathname === '/unlock' || pathname === '/health') {
    return resolve(event);
  }

  const expected = dashboardAccessKey(event.platform?.env);
  const provided = event.cookies.get('dash_key');

  if (!expected || provided !== expected) {
    redirect(303, `/unlock?next=${encodeURIComponent(pathname + search)}`);
  }

  return resolve(event);
};
