/**
 * Runtime Configuration - Architecture Studio
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
 * Merge runtime config with static defaults
 */
function mergeConfigs(defaults: SiteConfig, runtime: InjectedConfig): SiteConfig {
	const { _tenant, ...runtimeConfig } = runtime;

	return {
		// Identity
		name: runtimeConfig.name ?? defaults.name,
		tagline: runtimeConfig.tagline ?? defaults.tagline,
		description: runtimeConfig.description ?? defaults.description,

		// Contact
		email: runtimeConfig.email ?? defaults.email,
		phone: runtimeConfig.phone ?? defaults.phone,
		address: { ...defaults.address, ...(runtimeConfig.address ?? {}) },

		// Social
		social: { ...defaults.social, ...(runtimeConfig.social ?? {}) },

		// SEO
		url: runtimeConfig.url ?? defaults.url,
		locale: runtimeConfig.locale ?? defaults.locale,

		// Hero
		hero: { ...defaults.hero, ...(runtimeConfig.hero ?? {}) },

		// Content
		projects: runtimeConfig.projects ?? defaults.projects,
		studio: runtimeConfig.studio ? { ...defaults.studio, ...runtimeConfig.studio } : defaults.studio,
		services: runtimeConfig.services ?? defaults.services,
		recognition: runtimeConfig.recognition ?? defaults.recognition,
		inquiryTypes: runtimeConfig.inquiryTypes ?? defaults.inquiryTypes
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
