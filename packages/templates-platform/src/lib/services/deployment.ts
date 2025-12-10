/**
 * Deployment Service
 *
 * Handles building and deploying tenant sites using Cloudflare Workers for Platforms.
 *
 * Architecture:
 * 1. User submits config → stored in D1
 * 2. Build job queued → builds site with user's config
 * 3. Built assets deployed → Workers for Platforms dispatch namespace
 * 4. Subdomain routed → tenant site live
 */

import type { Tenant, TenantDeployment } from '../types';
import * as db from '../db';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DeploymentEnv {
  DB: D1Database;
  BUILD_QUEUE: Queue;
  DISPATCH_NAMESPACE: DispatchNamespace;
  SITE_BUCKET: R2Bucket;
}

interface BuildJob {
  tenantId: string;
  templateId: string;
  config: Record<string, unknown>;
  deploymentId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPLOYMENT FLOW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Queue a site for deployment
 */
export async function queueDeployment(
  env: DeploymentEnv,
  tenantId: string
): Promise<TenantDeployment> {
  const tenant = await db.getTenantById(env.DB, tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Create deployment record
  const deployment = await db.createDeployment(env.DB, tenantId, tenant.config);

  // Update tenant status
  await db.updateTenantStatus(env.DB, tenantId, 'queued');

  // Queue the build job
  const job: BuildJob = {
    tenantId,
    templateId: tenant.templateId,
    config: tenant.config,
    deploymentId: deployment.id
  };

  await env.BUILD_QUEUE.send(job);

  return deployment;
}

/**
 * Process a build job (called by Queue consumer)
 */
export async function processBuildJob(
  env: DeploymentEnv,
  job: BuildJob
): Promise<void> {
  const { tenantId, templateId, config, deploymentId } = job;

  try {
    // Update status to building
    await db.updateTenantStatus(env.DB, tenantId, 'building');
    await db.updateDeploymentStatus(env.DB, deploymentId, 'building');

    // Build the site (this is where the magic happens)
    const buildResult = await buildSite(templateId, config);

    if (!buildResult.success) {
      throw new Error(buildResult.error || 'Build failed');
    }

    // Deploy to Workers for Platforms
    await deployToEdge(env, tenantId, buildResult.assets);

    // Update status to active
    await db.markTenantDeployed(env.DB, tenantId);
    await db.updateDeploymentStatus(env.DB, deploymentId, 'deployed');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await db.updateTenantStatus(env.DB, tenantId, 'error', errorMessage);
    await db.updateDeploymentStatus(env.DB, deploymentId, 'failed', errorMessage);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

interface BuildResult {
  success: boolean;
  assets?: Map<string, Uint8Array>;
  error?: string;
}

/**
 * Build site with user config
 *
 * This generates the site by:
 * 1. Loading the template
 * 2. Injecting user configuration
 * 3. Pre-rendering static pages
 * 4. Returning built assets
 *
 * For MVP: We'll use pre-built templates and just inject config at runtime
 * Future: Full build system with Vite/esbuild
 */
async function buildSite(
  templateId: string,
  config: Record<string, unknown>
): Promise<BuildResult> {
  try {
    // For MVP, we don't actually "build" - we serve pre-built templates
    // and inject config via a runtime script
    //
    // The actual implementation would:
    // 1. Fetch template source from R2 or KV
    // 2. Run Vite build with config
    // 3. Return built assets

    // Placeholder - return success
    // Real implementation would call build worker
    return {
      success: true,
      assets: new Map()
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Build failed'
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE DEPLOYMENT (Workers for Platforms)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deploy built assets to Workers for Platforms
 *
 * Each tenant gets their own Worker script in the dispatch namespace.
 * The Worker serves the static site and handles dynamic routes.
 */
async function deployToEdge(
  env: DeploymentEnv,
  tenantId: string,
  assets: Map<string, Uint8Array>
): Promise<void> {
  // Store assets in R2
  for (const [path, content] of assets) {
    await env.SITE_BUCKET.put(`${tenantId}/${path}`, content);
  }

  // The tenant Worker script is deployed via the dispatch namespace
  // This is configured in wrangler.toml and routes based on subdomain
  //
  // The Worker:
  // 1. Receives request for subdomain.createsomething.space
  // 2. Fetches tenant config from D1
  // 3. Serves static assets from R2
  // 4. Injects config into HTML for runtime customization
}

// ═══════════════════════════════════════════════════════════════════════════
// TENANT WORKER TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate the Worker script for a tenant
 *
 * This script handles all requests for the tenant's subdomain
 */
export function generateTenantWorker(tenant: Tenant): string {
  return `
    // Tenant Worker for: ${tenant.subdomain}.createsomething.space
    // Generated: ${new Date().toISOString()}

    const TENANT_ID = '${tenant.id}';
    const TEMPLATE_ID = '${tenant.templateId}';
    const CONFIG = ${JSON.stringify(tenant.config)};

    export default {
      async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Serve static assets from R2
        const assetKey = TENANT_ID + path;
        const asset = await env.SITE_BUCKET.get(assetKey);

        if (asset) {
          const contentType = getContentType(path);
          return new Response(asset.body, {
            headers: { 'Content-Type': contentType }
          });
        }

        // Fallback to index.html for SPA routing
        const indexAsset = await env.SITE_BUCKET.get(TENANT_ID + '/index.html');
        if (indexAsset) {
          // Inject config into HTML
          let html = await indexAsset.text();
          html = html.replace(
            '</head>',
            '<script>window.__SITE_CONFIG__ = ' + JSON.stringify(CONFIG) + ';</script></head>'
          );
          return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
          });
        }

        return new Response('Not Found', { status: 404 });
      }
    };

    function getContentType(path) {
      const ext = path.split('.').pop();
      const types = {
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon'
      };
      return types[ext] || 'application/octet-stream';
    }
  `;
}
