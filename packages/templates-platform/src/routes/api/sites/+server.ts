import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as db from '$lib/db';
import { getTemplateById, validateConfig } from '$lib/services/template-registry';
import { trackEvent } from '$lib/services/analytics';

/**
 * POST /api/sites
 *
 * Create a new site from a template.
 * Requires authentication.
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	// Require authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	if (!platform?.env.DB) {
		throw error(500, 'Database not configured');
	}

	try {
		const body = await request.json() as {
			templateId?: string;
			subdomain?: string;
			config?: Record<string, unknown>;
		};
		const { templateId, subdomain, config } = body;

		console.log('[api/sites] Creating site:', { templateId, subdomain, hasConfig: !!config, userId: locals.user.id });

		// Validate required fields
		if (!templateId || !subdomain) {
			console.log('[api/sites] Missing fields:', { templateId, subdomain });
			return json({ success: false, error: 'templateId and subdomain are required' }, { status: 400 });
		}

		// Validate template exists
		const template = getTemplateById(templateId);
		if (!template) {
			console.log('[api/sites] Template not found:', templateId);
			return json({ success: false, error: `Template not found: ${templateId}` }, { status: 400 });
		}

		// Validate subdomain format
		const subdomainPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
		if (!subdomain || subdomain.length < 3 || !subdomainPattern.test(subdomain)) {
			return json(
				{ success: false, error: 'Invalid subdomain. Use at least 3 lowercase letters, numbers, or hyphens.' },
				{ status: 400 }
			);
		}

		// Check subdomain availability
		const isAvailable = await db.isSubdomainAvailable(platform.env.DB, subdomain);
		if (!isAvailable) {
			return json(
				{ success: false, error: 'This subdomain is already taken. Please choose another.' },
				{ status: 400 }
			);
		}

		// Validate config against schema
		const validation = validateConfig(templateId, config ?? {});
		if (!validation.valid) {
			console.log('[api/sites] Config validation failed:', validation.errors);
			return json(
				{ success: false, error: `Configuration invalid: ${validation.errors.join(', ')}` },
				{ status: 400 }
			);
		}

		// Use authenticated user ID
		const userId = locals.user.id;

		// Ensure user exists in local database (sync from Identity Worker)
		let user = await db.getUserById(platform.env.DB, userId);
		if (!user) {
			// Create user with defaults - they authenticated via Identity Worker
			user = await db.createUser(platform.env.DB, {
				id: userId,
				email: locals.user.email,
				plan: 'free',
				siteLimit: 3
			});
			console.log('[api/sites] Created new user:', user.id);
		}

		// Create tenant
		const tenant = await db.createTenant(platform.env.DB, {
			userId,
			templateId,
			subdomain,
			status: 'queued',
			config: config ?? {},
			tier: 'free'
		});

		// Queue deployment
		// For MVP: We'll deploy synchronously
		// TODO: Use Queue for async deployment
		await db.updateTenantStatus(platform.env.DB, tenant.id, 'building');

		// Simulate build (in production, this would be async)
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Mark as deployed
		await db.markTenantDeployed(platform.env.DB, tenant.id);

		// Track deploy event
		await trackEvent(platform.env.DB, {
			eventType: 'deploy',
			tenantId: tenant.id,
			templateId,
			userId,
			source: 'api',
			metadata: { subdomain }
		});

		return json({
			success: true,
			site: {
				id: tenant.id,
				subdomain: tenant.subdomain,
				url: `https://${tenant.subdomain}.createsomething.space`,
				status: 'active'
			}
		});

	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error('[api/sites] Site creation error:', errorMessage, err);
		return json(
			{ success: false, error: `Failed to create site: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

/**
 * GET /api/sites
 *
 * List user's sites.
 * Requires authentication.
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
	// Require authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	if (!platform?.env.DB) {
		throw error(500, 'Database not configured');
	}

	const sites = await db.getTenantsByUserId(platform.env.DB, locals.user.id);

	return json({
		sites: sites.map((site) => ({
			id: site.id,
			subdomain: site.subdomain,
			url: `https://${site.subdomain}.createsomething.space`,
			status: site.status,
			templateId: site.templateId,
			createdAt: site.createdAt,
			deployedAt: site.deployedAt
		}))
	});
};
