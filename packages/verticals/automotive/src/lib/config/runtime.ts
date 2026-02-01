import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { siteDefaults, type SiteConfig } from './site';

declare global {
	interface Window {
		__SITE_CONFIG__?: Partial<SiteConfig>;
	}
}

function getConfig(): SiteConfig {
	if (browser && window.__SITE_CONFIG__) {
		return {
			...siteDefaults,
			...window.__SITE_CONFIG__,
			// Merge arrays if provided, otherwise use defaults
			vehicles: window.__SITE_CONFIG__.vehicles || siteDefaults.vehicles,
			navLinks: window.__SITE_CONFIG__.navLinks || siteDefaults.navLinks,
			// Deep merge nested objects
			brand: {
				...siteDefaults.brand,
				...window.__SITE_CONFIG__.brand
			},
			hero: {
				...siteDefaults.hero,
				...window.__SITE_CONFIG__.hero
			},
			productShowcase: {
				...siteDefaults.productShowcase,
				...window.__SITE_CONFIG__.productShowcase
			},
			smartFeatures: {
				...siteDefaults.smartFeatures,
				...window.__SITE_CONFIG__.smartFeatures
			},
			values: {
				...siteDefaults.values,
				...window.__SITE_CONFIG__.values
			},
			community: {
				...siteDefaults.community,
				...window.__SITE_CONFIG__.community
			},
			footer: {
				...siteDefaults.footer,
				...window.__SITE_CONFIG__.footer
			}
		};
	}
	return siteDefaults;
}

export const siteConfig = writable<SiteConfig>(getConfig());

// Re-sync if window.__SITE_CONFIG__ changes (useful for dev)
if (browser) {
	siteConfig.set(getConfig());
}
