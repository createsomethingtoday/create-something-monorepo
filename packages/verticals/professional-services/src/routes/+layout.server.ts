import type { LayoutServerLoad } from './$types';
import { getSiteConfig } from '$lib/config/tenant';

/**
 * Layout Server Load
 *
 * Provides site configuration for all pages.
 * Resolves tenant config from D1 or falls back to static config.
 *
 * Resolution order:
 * 1. ?tenant=id query param (preview mode from dashboard)
 * 2. Subdomain (demo.createsomething.space → tenant "demo")
 * 3. Static siteConfig (development fallback)
 */

// Conditional prerendering: only prerender in static mode
// When deployed as multi-tenant, this is disabled
export const prerender = 'auto';

// Trailing slashes configuration
export const trailingSlash = 'never';

export const load: LayoutServerLoad = async ({ url, platform }) => {
	// Load tenant config (from D1 or static fallback)
	const { config, tenant, source } = await getSiteConfig(url, platform);

	return {
		// Site configuration (used by all pages)
		siteConfig: config,

		// Tenant metadata (for analytics, debugging)
		tenant: tenant
			? {
					id: tenant.id,
					subdomain: tenant.subdomain,
					status: tenant.status
				}
			: null,

		// Config source (for debugging)
		configSource: source
	};
};
