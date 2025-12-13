/**
 * Dashboard Home - Server Load
 *
 * Loads user's sites and redirects to editor if only one site.
 * Protected route: hooks.server.ts ensures user is authenticated.
 */

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getTenantsByUserId } from '$lib/db';

export const load: PageServerLoad = async ({ platform, locals }) => {
  // User is guaranteed to exist here (protected by hooks.server.ts)
  // If somehow not, return empty to be safe
  if (!locals.user) {
    return { sites: [] };
  }

  const db = platform?.env?.DB;
  if (!db) {
    return { sites: [] };
  }

  const sites = await getTenantsByUserId(db, locals.user.id);

  // If user has exactly one site, redirect directly to editor (Heideggerian: no unnecessary navigation)
  if (sites.length === 1) {
    throw redirect(302, `/dashboard/${sites[0].id}`);
  }

  return { sites };
};
