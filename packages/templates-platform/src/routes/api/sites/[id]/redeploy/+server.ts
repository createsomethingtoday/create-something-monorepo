/**
 * Site Redeploy API
 *
 * POST: Trigger a rebuild and redeploy of the site
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getTenantById, updateTenantStatus, createDeployment } from '$lib/db';

/**
 * POST /api/sites/[id]/redeploy
 *
 * Queues a rebuild with current config.
 * Returns deployment ID for tracking.
 */
export const POST: RequestHandler = async ({ params, platform }) => {
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

  // Only allow redeploy of active or configuring sites
  if (site.status === 'suspended') {
    throw error(400, 'Cannot redeploy suspended site');
  }

  // Create deployment record
  const deployment = await createDeployment(db, params.id, site.config);

  // Update site status to queued
  await updateTenantStatus(db, params.id, 'queued');

  // In production, this would queue a build job
  // For now, simulate immediate success
  // await platform?.env?.BUILD_QUEUE?.send({ tenantId: params.id, deploymentId: deployment.id });

  return json({
    success: true,
    deploymentId: deployment.id,
    message: 'Deployment queued'
  });
};
