/**
 * Site Config Context
 *
 * Provides site configuration to all components via Svelte context.
 * This enables dynamic tenant config without prop drilling.
 *
 * Usage in components:
 *   import { getSiteConfigFromContext } from '$lib/config/context';
 *   const config = getSiteConfigFromContext();
 */

import { getContext, setContext } from 'svelte';
import type { SiteConfig } from './site';
import { siteConfig as defaultConfig } from './site';

const SITE_CONFIG_KEY = Symbol('siteConfig');

/**
 * Set site config in context (called in +layout.svelte)
 */
export function setSiteConfigContext(config: SiteConfig): void {
	setContext(SITE_CONFIG_KEY, config);
}

/**
 * Get site config from context (called in components)
 * Falls back to default static config if context not set
 */
export function getSiteConfigFromContext(): SiteConfig {
	return getContext<SiteConfig>(SITE_CONFIG_KEY) ?? defaultConfig;
}

/**
 * Re-export types for convenience
 */
export type { SiteConfig } from './site';
