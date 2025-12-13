/**
 * Site Config Context
 *
 * Provides site configuration to all components via Svelte context.
 * This enables dynamic tenant config without prop drilling.
 *
 * Supports two deployment modes:
 * 1. D1 Database (server-side): Config loaded via +layout.server.ts
 * 2. R2/Router Worker (client-side): Config injected via window.__SITE_CONFIG__
 *
 * Usage in components:
 *   import { getSiteConfigFromContext } from '$lib/config/context';
 *   const config = getSiteConfigFromContext();
 */

import { getContext, setContext } from 'svelte';
import { browser } from '$app/environment';
import type { PersonalInjuryConfig } from './site';
import { siteConfig as defaultConfig } from './site';

const SITE_CONFIG_KEY = Symbol('siteConfig');

// Type for Router Worker injected config
interface InjectedConfig extends Partial<PersonalInjuryConfig> {
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
 * Set site config in context (called in +layout.svelte)
 */
export function setSiteConfigContext(config: PersonalInjuryConfig): void {
	setContext(SITE_CONFIG_KEY, config);
}

/**
 * Get site config from context (called in components)
 * Falls back to:
 * 1. window.__SITE_CONFIG__ (Router Worker injection)
 * 2. default static config
 */
export function getSiteConfigFromContext(): PersonalInjuryConfig {
	const contextConfig = getContext<PersonalInjuryConfig>(SITE_CONFIG_KEY);

	if (contextConfig) {
		return contextConfig;
	}

	// Check for Router Worker injected config (client-side)
	if (browser && window.__SITE_CONFIG__) {
		return mergeWithDefaults(window.__SITE_CONFIG__);
	}

	return defaultConfig;
}

/**
 * Check if running in multi-tenant mode (either D1 or Router Worker)
 */
export function isMultiTenantMode(): boolean {
	return browser && !!window.__SITE_CONFIG__?._tenant;
}

/**
 * Get tenant metadata from Router Worker injection
 */
export function getTenantInfo(): InjectedConfig['_tenant'] | null {
	if (browser && window.__SITE_CONFIG__?._tenant) {
		return window.__SITE_CONFIG__._tenant;
	}
	return null;
}

/**
 * Merge injected config with defaults
 */
function mergeWithDefaults(injected: InjectedConfig): PersonalInjuryConfig {
	const { _tenant, ...config } = injected;

	return {
		// Identity
		name: config.name ?? defaultConfig.name,
		tagline: config.tagline ?? defaultConfig.tagline,
		description: config.description ?? defaultConfig.description,
		email: config.email ?? defaultConfig.email,
		phone: config.phone ?? defaultConfig.phone,
		emergencyPhone: config.emergencyPhone ?? defaultConfig.emergencyPhone,
		available24_7: config.available24_7 ?? defaultConfig.available24_7,
		address: { ...defaultConfig.address, ...(config.address ?? {}) },
		social: { ...defaultConfig.social, ...(config.social ?? {}) },
		url: config.url ?? defaultConfig.url,
		locale: config.locale ?? defaultConfig.locale,

		// Hero
		hero: { ...defaultConfig.hero, ...(config.hero ?? {}) },

		// PI-specific
		accidentTypes: config.accidentTypes ?? defaultConfig.accidentTypes,
		recoveries: config.recoveries ?? defaultConfig.recoveries,
		contingencyFee: config.contingencyFee
			? { ...defaultConfig.contingencyFee, ...config.contingencyFee }
			: defaultConfig.contingencyFee,
		screening: config.screening
			? {
					minimumCriteria: { ...defaultConfig.screening.minimumCriteria, ...(config.screening.minimumCriteria ?? {}) },
					autoDeclineReasons: config.screening.autoDeclineReasons ?? defaultConfig.screening.autoDeclineReasons,
					hotLeadTriggers: { ...defaultConfig.screening.hotLeadTriggers, ...(config.screening.hotLeadTriggers ?? {}) }
				}
			: defaultConfig.screening,

		// Attorneys & Firm
		attorneys: config.attorneys ?? defaultConfig.attorneys,
		firm: config.firm ? { ...defaultConfig.firm, ...config.firm } : defaultConfig.firm,

		// Content
		statistics: config.statistics ?? defaultConfig.statistics,
		testimonials: config.testimonials ?? defaultConfig.testimonials,
		faq: config.faq ?? defaultConfig.faq,
		process: config.process ?? defaultConfig.process,

		// Workflows
		workflows: config.workflows ? { ...defaultConfig.workflows, ...config.workflows } : defaultConfig.workflows,

		// Legal
		disclaimer: config.disclaimer ?? defaultConfig.disclaimer,
		barAssociations: config.barAssociations ?? defaultConfig.barAssociations,
		recognition: config.recognition ?? defaultConfig.recognition
	};
}

/**
 * Re-export types for convenience
 */
export type { PersonalInjuryConfig } from './site';
