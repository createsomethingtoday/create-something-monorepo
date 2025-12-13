/**
 * Site Editor - Server Load
 *
 * Loads site config and template schema for editing.
 * Protected route: requires authentication and ownership.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, json } from '@sveltejs/kit';
import { getTenantById, updateTenantConfig } from '$lib/db';
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

  // Verify ownership
  if (site.userId !== locals.user.id) {
    throw error(403, 'Access denied');
  }

  const template = getTemplateById(site.templateId);

  if (!template) {
    throw error(500, 'Template configuration not found');
  }

  return { site, template };
};

export const actions: Actions = {
  save: async ({ request, params, platform, locals }) => {
    // Require authentication
    if (!locals.user) {
      return { success: false, error: 'Authentication required' };
    }

    const db = platform?.env?.DB;

    if (!db) {
      return { success: true, message: 'Saved (dev mode)' };
    }

    // Verify ownership
    const site = await getTenantById(db, params.siteId);
    if (!site || site.userId !== locals.user.id) {
      return { success: false, error: 'Access denied' };
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
