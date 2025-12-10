import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as db from '$lib/db';
import { getTemplateById, validateConfig } from '$lib/services/template-registry';
import { trackEvent } from '$lib/services/analytics';

/**
 * POST /api/sites
 *
 * Create a new site from a template
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env.DB) {
		throw error(500, 'Database not configured');
	}

	try {
		const body = await request.json();
		const { templateId, subdomain, config } = body;

		// Validate template exists
		const template = getTemplateById(templateId);
		if (!template) {
			return json({ success: false, error: 'Template not found' }, { status: 400 });
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
		const validation = validateConfig(templateId, config);
		if (!validation.valid) {
			return json(
				{ success: false, error: validation.errors.join(', ') },
				{ status: 400 }
			);
		}

		// For MVP: Create a temporary user if not logged in
		// TODO: Implement proper auth
		let userId = 'anonymous-' + crypto.randomUUID();

		// Create tenant
		const tenant = await db.createTenant(platform.env.DB, {
			userId,
			templateId,
			subdomain,
			status: 'queued',
			config,
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
		console.error('Site creation error:', err);
		return json(
			{ success: false, error: 'Failed to create site. Please try again.' },
			{ status: 500 }
		);
	}
};

/**
 * GET /api/sites
 *
 * List user's sites
 */
export const GET: RequestHandler = async ({ platform, url }) => {
	if (!platform?.env.DB) {
		throw error(500, 'Database not configured');
	}

	// TODO: Get userId from session
	const userId = url.searchParams.get('userId');
	if (!userId) {
		return json({ sites: [] });
	}

	const sites = await db.getTenantsByUserId(platform.env.DB, userId);

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
