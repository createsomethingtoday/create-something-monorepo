/**
 * Site Config Context - Svelte 5 with Writable Store
 *
 * Provides site configuration using a writable store for true reactivity.
 * Supports hydration from window.__SITE_CONFIG__ injected by the router worker.
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { SiteConfig } from './site';
import { siteConfig as defaultConfig } from './site';

interface InjectedConfig extends Partial<SiteConfig> {
	_tenant?: {
		id: string;
		subdomain: string;
		templateId: string;
	};
}

declare global {
	interface Window {
		__SITE_CONFIG__?: InjectedConfig;
	}
}

export function mergeWithDefaults(injected: InjectedConfig): SiteConfig {
	const { _tenant, ...config } = injected;

	return {
		name: config.name ?? defaultConfig.name,
		tagline: config.tagline ?? defaultConfig.tagline,
		description: config.description ?? defaultConfig.description,
		email: config.email ?? defaultConfig.email,
		phone: config.phone ?? defaultConfig.phone,
		address: { ...defaultConfig.address, ...(config.address ?? {}) },
		hours: { ...defaultConfig.hours, ...(config.hours ?? {}) },
		serviceHours: { ...defaultConfig.serviceHours, ...(config.serviceHours ?? {}) },
		social: { ...defaultConfig.social, ...(config.social ?? {}) },
		url: config.url ?? defaultConfig.url,
		locale: config.locale ?? defaultConfig.locale,
		menuCategories: config.menuCategories ?? defaultConfig.menuCategories,
		featuredDishes: config.featuredDishes ?? defaultConfig.featuredDishes,
		dietaryOptions: config.dietaryOptions ?? defaultConfig.dietaryOptions,
		reservations: { ...defaultConfig.reservations, ...(config.reservations ?? {}) },
		privateEvents: { ...defaultConfig.privateEvents, ...(config.privateEvents ?? {}) },
		team: config.team ?? defaultConfig.team,
		location: { ...defaultConfig.location, ...(config.location ?? {}) },
		accolades: config.accolades ?? defaultConfig.accolades,
		giftCards: { ...defaultConfig.giftCards, ...(config.giftCards ?? {}) }
	} as SiteConfig;
}

function createSiteConfigStore() {
	const store = writable<SiteConfig>(defaultConfig);

	if (browser && window.__SITE_CONFIG__) {
		store.set(mergeWithDefaults(window.__SITE_CONFIG__));
	}

	return store;
}

export const siteConfig = createSiteConfigStore();

export function initSiteConfig(): void {
	if (browser && window.__SITE_CONFIG__) {
		siteConfig.set(mergeWithDefaults(window.__SITE_CONFIG__));
	}
}

export function isMultiTenantMode(): boolean {
	return browser && !!window.__SITE_CONFIG__?._tenant;
}

export function getTenantInfo(): InjectedConfig['_tenant'] | null {
	if (browser && window.__SITE_CONFIG__?._tenant) {
		return window.__SITE_CONFIG__._tenant;
	}
	return null;
}

export function getSiteConfigFromContext(): SiteConfig {
	return get(siteConfig);
}

export type { SiteConfig } from './site';
