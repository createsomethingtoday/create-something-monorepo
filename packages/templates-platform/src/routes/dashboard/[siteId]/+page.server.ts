/**
 * Site Editor - Server Load
 *
 * Loads site config and template schema for editing.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, json } from '@sveltejs/kit';
import { getTenantById, updateTenantConfig } from '$lib/db';
import { getTemplateById } from '$lib/services/template-registry';

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = platform?.env?.DB;

  if (!db) {
    // Development mode: return mock data
    return {
      site: {
        id: params.siteId,
        subdomain: 'demo-site',
        templateId: 'tpl_professional_services',
        status: 'active',
        config: {
          name: 'Demo Site',
          tagline: 'Your tagline here',
          description: 'Your description here'
        },
        tier: 'free',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      template: getTemplateById('tpl_professional_services')
    };
  }

  const site = await getTenantById(db, params.siteId);

  if (!site) {
    throw error(404, 'Site not found');
  }

  const template = getTemplateById(site.templateId);

  if (!template) {
    throw error(500, 'Template configuration not found');
  }

  return { site, template };
};

export const actions: Actions = {
  save: async ({ request, params, platform }) => {
    const db = platform?.env?.DB;

    if (!db) {
      return { success: true, message: 'Saved (dev mode)' };
    }

    const formData = await request.formData();
    const configJson = formData.get('config');

    if (typeof configJson !== 'string') {
      return { success: false, error: 'Invalid config data' };
    }

    try {
      const config = JSON.parse(configJson);
      await updateTenantConfig(db, params.siteId, config);
      return { success: true, message: 'Changes saved' };
    } catch (e) {
      return { success: false, error: 'Failed to save changes' };
    }
  }
};
