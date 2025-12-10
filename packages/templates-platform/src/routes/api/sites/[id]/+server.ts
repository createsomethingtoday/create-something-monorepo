/**
 * Site API - Individual Site Operations
 *
 * GET:   Get site with full config
 * PATCH: Update config (partial merge)
 * DELETE: Remove site
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getTenantById, updateTenantConfig, updateTenantStatus } from '$lib/db';
import { getTemplateById } from '$lib/services/template-registry';

/**
 * GET /api/sites/[id]
 *
 * Returns full site data including config and template schema.
 */
export const GET: RequestHandler = async ({ params, platform }) => {
  const db = platform?.env?.DB;

  if (!db) {
    // Development mode: return mock data
    return json({
      site: {
        id: params.id,
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
    });
  }

  const site = await getTenantById(db, params.id);

  if (!site) {
    throw error(404, 'Site not found');
  }

  const template = getTemplateById(site.templateId);

  return json({ site, template });
};

/**
 * PATCH /api/sites/[id]
 *
 * Updates site config (partial merge).
 * Auto-save sends updates here.
 */
export const PATCH: RequestHandler = async ({ params, request, platform }) => {
  const db = platform?.env?.DB;

  const body = await request.json();
  const { config } = body;

  if (!config || typeof config !== 'object') {
    throw error(400, 'Invalid config data');
  }

  if (!db) {
    // Development mode: simulate success
    return json({
      success: true,
      message: 'Config updated (dev mode)',
      updatedAt: new Date().toISOString()
    });
  }

  // Get existing site
  const site = await getTenantById(db, params.id);

  if (!site) {
    throw error(404, 'Site not found');
  }

  // Merge new config with existing
  const mergedConfig = {
    ...site.config,
    ...config
  };

  // Update in database
  await updateTenantConfig(db, params.id, mergedConfig);

  return json({
    success: true,
    message: 'Config updated',
    updatedAt: new Date().toISOString()
  });
};

/**
 * DELETE /api/sites/[id]
 *
 * Soft-delete by marking as suspended.
 */
export const DELETE: RequestHandler = async ({ params, platform }) => {
  const db = platform?.env?.DB;

  if (!db) {
    return json({ success: true, message: 'Site deleted (dev mode)' });
  }

  const site = await getTenantById(db, params.id);

  if (!site) {
    throw error(404, 'Site not found');
  }

  // Soft delete by setting status to suspended
  await updateTenantStatus(db, params.id, 'suspended');

  return json({
    success: true,
    message: 'Site deleted'
  });
};
