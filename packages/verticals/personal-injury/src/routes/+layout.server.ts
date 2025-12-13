import type { LayoutServerLoad } from './$types';
import { siteConfig } from '$lib/config/site';

/**
 * Layout Server Load
 *
 * Provides default site configuration for pre-rendering.
 * At runtime, client-side code will check for window.__SITE_CONFIG__
 * injected by the router worker and use that instead.
 *
 * Architecture:
 * - Build time: Static siteConfig for pre-rendering
 * - Runtime: window.__SITE_CONFIG__ (injected by templates-router) overrides
 */

// Enable prerendering for static site generation
export const prerender = true;

// Trailing slashes configuration
export const trailingSlash = 'never';

export const load: LayoutServerLoad = async () => {
	// Return static config for pre-rendering
	// Client-side will hydrate with window.__SITE_CONFIG__ if available
	return {
		// Default site configuration (used for pre-rendering)
		siteConfig: siteConfig,

		// No tenant at build time
		tenant: null,

		// Static source
		configSource: 'static' as const
	};
};
