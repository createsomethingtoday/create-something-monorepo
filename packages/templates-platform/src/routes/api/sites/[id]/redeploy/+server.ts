/**
 * Site Redeploy API
 *
 * POST: Trigger a rebuild and redeploy of the site
 * Requires authentication and ownership.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getTenantById, createDeployment, markTenantDeployed } from '$lib/db';

/**
 * POST /api/sites/[id]/redeploy
 *
 * Deploys site immediately with current config.
 * Templates are pre-built in R2, so no build step needed.
 * Returns deployment ID for tracking.
 */
export const POST: RequestHandler = async ({ params, platform, locals }) => {
  // Require authentication
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  const db = platform?.env?.DB;

  if (!db) {
    // Development mode: simulate deployment
    return json({
      success: true,
      deploymentId: `dep_${Date.now()}`,
      message: 'Deployment queued (dev mode)'
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

  // Only allow redeploy of active or configuring sites
  if (site.status === 'suspended') {
    throw error(400, 'Cannot redeploy suspended site');
  }

  // Create deployment record
  const deployment = await createDeployment(db, params.id, site.config);

  // Mark site as deployed and active immediately
  // (Templates are pre-built in R2, no build step needed)
  await markTenantDeployed(db, params.id);

  // Clear KV cache so router sees new config immediately
  const cacheKey = `tenant:subdomain:${site.subdomain}`;
  await platform?.env?.KV?.delete(cacheKey);

  return json({
    success: true,
    deploymentId: deployment.id,
    message: 'Site deployed successfully'
  });
};
