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
			products: window.__SITE_CONFIG__.products || siteDefaults.products,
			categories: window.__SITE_CONFIG__.categories || siteDefaults.categories,
			// Deep merge footer
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
