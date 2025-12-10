/**
 * Dashboard Home - Server Load
 *
 * Loads user's sites and redirects to editor if only one site.
 */

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getTenantsByUserId } from '$lib/db';

export const load: PageServerLoad = async ({ platform, locals }) => {
  // For now, use a mock user ID until auth is implemented
  const userId = locals.user?.id ?? 'demo-user';

  const db = platform?.env?.DB;
  if (!db) {
    return { sites: [] };
  }

  const sites = await getTenantsByUserId(db, userId);

  // If user has exactly one site, redirect directly to editor (Heideggerian: no unnecessary navigation)
  if (sites.length === 1) {
    throw redirect(302, `/dashboard/${sites[0].id}`);
  }

  return { sites };
};
