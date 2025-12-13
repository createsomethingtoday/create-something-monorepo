/**
 * Site Config Context - Svelte 5 with Writable Store
 *
 * Provides site configuration using a writable store for true reactivity.
 * Supports hydration from window.__SITE_CONFIG__ injected by the router worker.
 *
 * Usage in components:
 *   import { siteConfig } from '$lib/config/context';
 *   // Access via $siteConfig.name or use get(siteConfig)
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { SiteConfig } from './site';
import { siteConfig as defaultConfig } from './site';

// Type for Router Worker injected config
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
 * Merge injected config with defaults
 */
export function mergeWithDefaults(injected: InjectedConfig): SiteConfig {
	const { _tenant, ...config } = injected;

	return {
		name: config.name ?? defaultConfig.name,
		tagline: config.tagline ?? defaultConfig.tagline,
		description: config.description ?? defaultConfig.description,
		email: config.email ?? defaultConfig.email,
		phone: config.phone ?? defaultConfig.phone,
		address: { ...defaultConfig.address, ...(config.address ?? {}) },
		social: { ...defaultConfig.social, ...(config.social ?? {}) },
		url: config.url ?? defaultConfig.url,
		locale: config.locale ?? defaultConfig.locale,
		hero: { ...defaultConfig.hero, ...(config.hero ?? {}) },
		projects: config.projects ?? defaultConfig.projects,
		studio: config.studio ? { ...defaultConfig.studio, ...config.studio } : defaultConfig.studio,
		services: config.services ?? defaultConfig.services,
		recognition: config.recognition ?? defaultConfig.recognition
	} as SiteConfig;
}

/**
 * Create the writable store with default config
 */
function createSiteConfigStore() {
	// Start with defaults
	const store = writable<SiteConfig>(defaultConfig);

	// On client, immediately check for injected config
	if (browser && window.__SITE_CONFIG__) {
		store.set(mergeWithDefaults(window.__SITE_CONFIG__));
	}

	return store;
}

/**
 * The reactive site config store
 * Use with $siteConfig in Svelte components
 */
export const siteConfig = createSiteConfigStore();

/**
 * Initialize config from window.__SITE_CONFIG__ if available
 * Called from +layout.svelte on mount
 */
export function initSiteConfig(): void {
	if (browser && window.__SITE_CONFIG__) {
		siteConfig.set(mergeWithDefaults(window.__SITE_CONFIG__));
	}
}

/**
 * Check if running in multi-tenant mode
 */
export function isMultiTenantMode(): boolean {
	return browser && !!window.__SITE_CONFIG__?._tenant;
}

/**
 * Get tenant metadata
 */
export function getTenantInfo(): InjectedConfig['_tenant'] | null {
	if (browser && window.__SITE_CONFIG__?._tenant) {
		return window.__SITE_CONFIG__._tenant;
	}
	return null;
}

// Legacy exports for backward compatibility
export function setSiteConfigContext(_config: SiteConfig): void {
	// No-op for backward compatibility
}

export function getSiteConfigFromContext(): SiteConfig {
	return get(siteConfig);
}

/**
 * Re-export types
 */
export type { SiteConfig } from './site';
