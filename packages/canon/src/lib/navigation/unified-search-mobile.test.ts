// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import UnifiedSearch from './UnifiedSearch.svelte';

let target: HTMLElement | undefined;
let instance: Record<string, unknown> | undefined;
let observeBoundary: ((entries: IntersectionObserverEntry[]) => void) | undefined;

afterEach(() => {
	if (instance) {
		unmount(instance as never);
		instance = undefined;
	}
	target?.remove();
	target = undefined;
	document.querySelector('[data-mobile-search-boundary]')?.remove();
	observeBoundary = undefined;
	vi.unstubAllGlobals();
});

describe('UnifiedSearch mobile campaign controls', () => {
	it('keeps the floating search control clear until the opted-in campaign opening exits', () => {
		class MockIntersectionObserver {
			constructor(callback: IntersectionObserverCallback) {
				observeBoundary = (entries) => callback(entries, this as unknown as IntersectionObserver);
			}

			observe = vi.fn();
			disconnect = vi.fn();
			unobserve = vi.fn();
			takeRecords = vi.fn(() => []);
			root = null;
			rootMargin = '0px';
			thresholds = [];
		}

		vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

		const boundary = document.createElement('section');
		boundary.dataset.mobileSearchBoundary = 'true';
		document.body.appendChild(boundary);
		target = document.createElement('div');
		document.body.appendChild(target);

		instance = mount(UnifiedSearch, {
			target,
			props: {
				enableAnalytics: false,
				deferMobileButtonUntilCampaignExit: true
			}
		}) as Record<string, unknown>;
		flushSync();

		expect(target.querySelector('[aria-label="Open search"]')).toBeNull();

		observeBoundary?.([{ isIntersecting: false } as IntersectionObserverEntry]);
		flushSync();

		expect(target.querySelector('[aria-label="Open search"]')).not.toBeNull();
	});
});
