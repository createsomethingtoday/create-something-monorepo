/**
 * Site Config Context - Svelte 5 with Writable Store
 *
 * Provides site configuration using a writable store for true reactivity.
 * Supports hydration from window.__SITE_CONFIG__ injected by the router worker.
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { RestaurantConfig } from './site';
import { siteConfig as defaultConfig } from './site';

interface InjectedConfig extends Partial<RestaurantConfig> {
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

export function mergeWithDefaults(injected: InjectedConfig): RestaurantConfig {
	const { _tenant, ...config } = injected;

	return {
		name: config.name ?? defaultConfig.name,
		tagline: config.tagline ?? defaultConfig.tagline,
		description: config.description ?? defaultConfig.description,
		location: config.location ?? defaultConfig.location,
		hero: { ...defaultConfig.hero, ...(config.hero ?? {}) },
		email: config.email ?? defaultConfig.email,
		phone: config.phone ?? defaultConfig.phone,
		address: { ...defaultConfig.address, ...(config.address ?? {}) },
		hours: config.hours ?? defaultConfig.hours,
		social: config.social ?? defaultConfig.social,
		url: config.url ?? defaultConfig.url,
		locale: config.locale ?? defaultConfig.locale,
		chefChoice: config.chefChoice ?? defaultConfig.chefChoice,
		menuCategories: config.menuCategories ?? defaultConfig.menuCategories,
		ambiance: { ...defaultConfig.ambiance, ...(config.ambiance ?? {}) },
		reservations: { ...defaultConfig.reservations, ...(config.reservations ?? {}) },
		privateEvents: { ...defaultConfig.privateEvents, ...(config.privateEvents ?? {}) },
		footer: { ...defaultConfig.footer, ...(config.footer ?? {}) }
	} as RestaurantConfig;
}

function createSiteConfigStore() {
	const store = writable<RestaurantConfig>(defaultConfig);

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

export function getSiteConfigFromContext(): RestaurantConfig {
	return get(siteConfig);
}

export type { RestaurantConfig } from './site';
