/**
 * Runtime Configuration - Professional Services (Architecture Studio)
 *
 * Enables multi-tenant deployment by reading config from window.__SITE_CONFIG__
 * when deployed via the templates-platform Router Worker.
 *
 * Canon: The configuration disappears into the experience.
 */

import { browser } from '$app/environment';
import { siteConfig as staticConfig, type LawFirmConfig } from './site';
import { readable } from 'svelte/store';

// Type for the injected config from Router Worker
interface InjectedConfig extends Partial<LawFirmConfig> {
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
export function getSiteConfig(): LawFirmConfig {
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
function mergeConfigs(defaults: LawFirmConfig, runtime: InjectedConfig): LawFirmConfig {
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

		// Law Firm Specific
		practiceAreas: runtimeConfig.practiceAreas ?? defaults.practiceAreas,
		attorneys: runtimeConfig.attorneys ?? defaults.attorneys,
		results: runtimeConfig.results ?? defaults.results,
		firm: runtimeConfig.firm ? { ...defaults.firm, ...runtimeConfig.firm } : defaults.firm,
		workflows: runtimeConfig.workflows ? { ...defaults.workflows, ...runtimeConfig.workflows } : defaults.workflows,
		disclaimer: runtimeConfig.disclaimer ?? defaults.disclaimer,
		barAssociations: runtimeConfig.barAssociations ?? defaults.barAssociations,
		recognition: runtimeConfig.recognition ?? defaults.recognition,
		statistics: runtimeConfig.statistics ?? defaults.statistics,
		testimonials: runtimeConfig.testimonials ?? defaults.testimonials,
		faq: runtimeConfig.faq ?? defaults.faq
	};
}

/**
 * Reactive config store for Svelte components
 */
export const config = readable<LawFirmConfig>(staticConfig, (set) => {
	if (browser) {
		set(getSiteConfig());
	}
	return () => {};
});
