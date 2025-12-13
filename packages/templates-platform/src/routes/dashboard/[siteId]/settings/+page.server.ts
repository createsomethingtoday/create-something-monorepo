/**
 * Site Settings - Server Load
 *
 * Loads site data for settings page.
 * Protected route: requires authentication and ownership.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getTenantById } from '$lib/db';
import { getTemplateById } from '$lib/services/template-registry';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  // User is guaranteed by hooks.server.ts
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  const db = platform?.env?.DB;

  if (!db) {
    // Development mode: return mock data
    return {
      site: {
        id: params.siteId,
        subdomain: 'demo-site',
        customDomain: null,
        templateId: 'tpl_professional_services',
        status: 'active',
        config: {
          name: 'Demo Site',
          tagline: 'Your tagline here'
        },
        tier: 'free',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deployedAt: new Date().toISOString()
      },
      template: getTemplateById('tpl_professional_services')
    };
  }

  const site = await getTenantById(db, params.siteId);

  if (!site) {
    throw error(404, 'Site not found');
  }

  // Verify ownership
  if (site.userId !== locals.user.id) {
    throw error(403, 'Access denied');
  }

  const template = getTemplateById(site.templateId);

  return { site, template };
};
