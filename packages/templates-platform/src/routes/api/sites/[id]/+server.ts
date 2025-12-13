/**
 * Site API - Individual Site Operations
 *
 * GET:   Get site with full config
 * PATCH: Update config (partial merge)
 * DELETE: Remove site
 *
 * All operations require authentication and ownership verification.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getTenantById, updateTenantConfig, updateTenantStatus } from '$lib/db';
import { getTemplateById } from '$lib/services/template-registry';

/**
 * GET /api/sites/[id]
 *
 * Returns full site data including config and template schema.
 * Requires authentication and ownership.
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  // Require authentication
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

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

  // Verify ownership
  if (site.userId !== locals.user.id) {
    throw error(403, 'Access denied');
  }

  const template = getTemplateById(site.templateId);

  return json({ site, template });
};

/**
 * PATCH /api/sites/[id]
 *
 * Updates site config (partial merge).
 * Auto-save sends updates here.
 * Requires authentication and ownership.
 */
export const PATCH: RequestHandler = async ({ params, request, platform, locals }) => {
  // Require authentication
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  const db = platform?.env?.DB;

  const body = await request.json() as { config?: Record<string, unknown> };
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

  // Verify ownership
  if (site.userId !== locals.user.id) {
    throw error(403, 'Access denied');
  }

  // Merge new config with existing
  const mergedConfig = {
    ...site.config,
    ...config
  };

  // Update in database
  await updateTenantConfig(db, params.id, mergedConfig);

  // Clear KV cache so router sees new config immediately
  // Without this, changes are delayed up to 5 minutes (cache TTL)
  const cacheKey = `tenant:subdomain:${site.subdomain}`;
  await platform?.env?.KV?.delete(cacheKey);

  // Also clear custom domain cache if configured
  if (site.customDomain) {
    const domainCacheKey = `tenant:domain:${site.customDomain}`;
    await platform?.env?.KV?.delete(domainCacheKey);
  }

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
 * Requires authentication and ownership.
 */
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  // Require authentication
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  const db = platform?.env?.DB;

  if (!db) {
    return json({ success: true, message: 'Site deleted (dev mode)' });
  }

  const site = await getTenantById(db, params.id);

  if (!site) {
    throw error(404, 'Site not found');
  }

  // Verify ownership
  if (site.userId !== locals.user.id) {
    throw error(403, 'Access denied');
  }

  // Soft delete by setting status to suspended
  await updateTenantStatus(db, params.id, 'suspended');

  return json({
    success: true,
    message: 'Site deleted'
  });
};
