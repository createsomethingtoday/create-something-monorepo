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
			// Deep merge products and categories
			products: {
				new: window.__SITE_CONFIG__.products?.new || siteDefaults.products.new,
				iconic: window.__SITE_CONFIG__.products?.iconic || siteDefaults.products.iconic
			},
			categories: window.__SITE_CONFIG__.categories || siteDefaults.categories,
			contact: {
				...siteDefaults.contact,
				...window.__SITE_CONFIG__.contact
			},
			social: {
				...siteDefaults.social,
				...window.__SITE_CONFIG__.social
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
