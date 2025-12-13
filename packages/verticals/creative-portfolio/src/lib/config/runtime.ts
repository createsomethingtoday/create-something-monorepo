/**
 * Runtime Configuration - Creative Portfolio
 *
 * Enables multi-tenant deployment by reading config from window.__SITE_CONFIG__
 * when deployed via the templates-platform Router Worker.
 *
 * Canon: The configuration disappears into the experience.
 * Users see their site, not the mechanism.
 */

import { browser } from '$app/environment';
import { siteConfig as staticConfig, type SiteConfig } from './site';

// Type for the injected config from Router Worker
interface InjectedConfig extends Partial<SiteConfig> {
	_tenant?: {
		id: string;
		subdomain: string;
		templateId: string;
	};
}

// Extend window type
declare global {
	interface Window {
		__SITE_CONFIG__?: InjectedConfig;
	}
}

/**
 * Get the current site configuration.
 *
 * Priority:
 * 1. Runtime config from window.__SITE_CONFIG__ (multi-tenant deployment)
 * 2. Static config from site.ts (development / standalone deployment)
 *
 * The merge is shallow for top-level properties but preserves
 * nested structures from static config when not overridden.
 */
export function getSiteConfig(): SiteConfig {
	if (browser && window.__SITE_CONFIG__) {
		return mergeConfigs(staticConfig, window.__SITE_CONFIG__);
	}
	return staticConfig;
}

/**
 * Check if running in multi-tenant mode
 */
export function isMultiTenant(): boolean {
	return browser && !!window.__SITE_CONFIG__?._tenant;
}

/**
 * Get tenant metadata (only available in multi-tenant mode)
 */
export function getTenantInfo(): InjectedConfig['_tenant'] | null {
	if (browser && window.__SITE_CONFIG__?._tenant) {
		return window.__SITE_CONFIG__._tenant;
	}
	return null;
}

/**
 * Merge runtime config with static defaults
 */
function mergeConfigs(defaults: SiteConfig, runtime: InjectedConfig): SiteConfig {
	// Remove _tenant from the merge (it's metadata, not config)
	const { _tenant, ...runtimeConfig } = runtime;

	return {
		// Identity
		name: runtimeConfig.name ?? defaults.name,
		role: runtimeConfig.role ?? defaults.role,
		location: runtimeConfig.location ?? defaults.location,
		bio: runtimeConfig.bio ?? defaults.bio,

		// Contact
		email: runtimeConfig.email ?? defaults.email,

		// Social - merge object
		social: {
			...defaults.social,
			...(runtimeConfig.social ?? {})
		},

		// SEO
		url: runtimeConfig.url ?? defaults.url,
		locale: runtimeConfig.locale ?? defaults.locale,

		// Work - use runtime if provided, otherwise static
		work: runtimeConfig.work ?? defaults.work,

		// Services
		services: runtimeConfig.services ?? defaults.services,

		// Clients
		clients: runtimeConfig.clients ?? defaults.clients,

		// Availability - merge object
		availability: {
			...defaults.availability,
			...(runtimeConfig.availability ?? {})
		}
	} as SiteConfig;
}

/**
 * Reactive config store for Svelte components
 *
 * Usage:
 *   import { config } from '$lib/config/runtime';
 *   <h1>{$config.name}</h1>
 */
import { readable } from 'svelte/store';

export const config = readable<SiteConfig>(staticConfig, (set) => {
	if (browser) {
		// Set initial value from runtime config if available
		set(getSiteConfig());
	}
	// No cleanup needed
	return () => {};
});
