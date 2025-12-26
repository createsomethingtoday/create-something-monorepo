/**
 * Runtime Configuration - Creative Agency
 *
 * Enables multi-tenant deployment by reading config from window.__SITE_CONFIG__
 * when deployed via the templates-platform Router Worker.
 *
 * Canon: The configuration disappears into the experience.
 */

import { browser } from '$app/environment';
import { siteConfig as staticConfig, type SiteConfig } from './site';
import { readable } from 'svelte/store';

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
 * Unflatten dot-notation keys into nested objects
 * e.g., { "address.city": "Seattle" } -> { address: { city: "Seattle" } }
 */
function unflattenConfig(flat: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(flat)) {
		if (key.includes('.')) {
			const parts = key.split('.');
			let current = result;
			for (let i = 0; i < parts.length - 1; i++) {
				const part = parts[i];
				if (!(part in current) || typeof current[part] !== 'object') {
					current[part] = {};
				}
				current = current[part] as Record<string, unknown>;
			}
			current[parts[parts.length - 1]] = value;
		} else {
			if (value !== undefined) {
				result[key] = value;
			}
		}
	}

	return result;
}

/**
 * Merge runtime config with static defaults
 */
function mergeConfigs(defaults: SiteConfig, runtime: InjectedConfig): SiteConfig {
	const { _tenant, ...flatConfig } = runtime;

	// Unflatten dot-notation keys (e.g., "address.city" -> address: { city: ... })
	const runtimeConfig = unflattenConfig(flatConfig as Record<string, unknown>) as Partial<SiteConfig>;

	return {
		// Identity
		name: runtimeConfig.name ?? defaults.name,
		tagline: runtimeConfig.tagline ?? defaults.tagline,
		description: runtimeConfig.description ?? defaults.description,

		// Contact
		email: runtimeConfig.email ?? defaults.email,
		phone: runtimeConfig.phone ?? defaults.phone,
		address: { ...defaults.address, ...((runtimeConfig.address as object) ?? {}) },

		// Social
		social: { ...defaults.social, ...((runtimeConfig.social as object) ?? {}) },

		// SEO
		url: runtimeConfig.url ?? defaults.url,
		locale: runtimeConfig.locale ?? defaults.locale,

		// Hero
		hero: { ...defaults.hero, ...((runtimeConfig.hero as object) ?? {}) },

		// Content
		work: runtimeConfig.work ?? defaults.work,
		services: runtimeConfig.services ?? defaults.services,
		stats: runtimeConfig.stats ?? defaults.stats,
		clients: runtimeConfig.clients ?? defaults.clients,
		team: runtimeConfig.team ?? defaults.team
	} as SiteConfig;
}

/**
 * Reactive config store for Svelte components
 */
export const config = readable<SiteConfig>(staticConfig, (set) => {
	if (browser) {
		set(getSiteConfig());
	}
	return () => {};
});
