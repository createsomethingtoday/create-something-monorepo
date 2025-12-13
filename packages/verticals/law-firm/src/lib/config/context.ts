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
import type { LawFirmConfig } from './site';
import { siteConfig as defaultConfig } from './site';

const SITE_CONFIG_KEY = Symbol('siteConfig');

// Type for Router Worker injected config
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
 * Set site config in context (called in +layout.svelte)
 */
export function setSiteConfigContext(config: LawFirmConfig): void {
	setContext(SITE_CONFIG_KEY, config);
}

/**
 * Get site config from context (called in components)
 * Falls back to:
 * 1. window.__SITE_CONFIG__ (Router Worker injection)
 * 2. default static config
 */
export function getSiteConfigFromContext(): LawFirmConfig {
	const contextConfig = getContext<LawFirmConfig>(SITE_CONFIG_KEY);

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
function mergeWithDefaults(injected: InjectedConfig): LawFirmConfig {
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
		practiceAreas: config.practiceAreas ?? defaultConfig.practiceAreas,
		attorneys: config.attorneys ?? defaultConfig.attorneys,
		results: config.results ?? defaultConfig.results,
		firm: config.firm ? { ...defaultConfig.firm, ...config.firm } : defaultConfig.firm,
		workflows: config.workflows ? { ...defaultConfig.workflows, ...config.workflows } : defaultConfig.workflows,
		disclaimer: config.disclaimer ?? defaultConfig.disclaimer,
		barAssociations: config.barAssociations ?? defaultConfig.barAssociations,
		recognition: config.recognition ?? defaultConfig.recognition
	};
}

/**
 * Re-export types for convenience
 */
export type { LawFirmConfig } from './site';
