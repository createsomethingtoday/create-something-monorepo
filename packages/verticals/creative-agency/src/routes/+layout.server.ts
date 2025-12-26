import type { LayoutServerLoad } from './$types';
import { siteConfig } from '$lib/config/site';

/**
 * Layout Server Load
 *
 * Provides default site configuration for pre-rendering.
 * At runtime, client-side code will check for window.__SITE_CONFIG__
 * injected by the router worker and use that instead.
 */

// Enable prerendering for static site generation
export const prerender = true;

// Trailing slashes configuration
export const trailingSlash = 'never';

export const load: LayoutServerLoad = async () => {
	return {
		siteConfig: siteConfig,
		tenant: null,
		configSource: 'static' as const
	};
};
