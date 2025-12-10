/**
 * Site Settings - Server Load
 *
 * Loads site data for settings page.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getTenantById } from '$lib/db';
import { getTemplateById } from '$lib/services/template-registry';

export const load: PageServerLoad = async ({ params, platform }) => {
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

  const template = getTemplateById(site.templateId);

  return { site, template };
};
