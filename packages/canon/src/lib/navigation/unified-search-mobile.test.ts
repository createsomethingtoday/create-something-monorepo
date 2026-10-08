// @vitest-environment jsdom
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
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
	vi.useRealTimers();
});

describe('UnifiedSearch shortcut close compatibility', () => {
	for (const modifier of ['metaKey', 'ctrlKey'] as const) {
		it(`preserves the default query and fetched results across ${modifier} toggles`, async () => {
			vi.useFakeTimers();
			const fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ results: [{ id: 'service-1', title: 'Persisted result', description: 'Public service', property: 'agency', type: 'service', url: '/services', path: '/services', score: 1 }], total: 1, took: 1 })
			});
			vi.stubGlobal('fetch', fetch);
			const onclose = vi.fn();
			target = document.createElement('div');
			document.body.appendChild(target);
			instance = mount(UnifiedSearch, { target, props: { enableAnalytics: false, onclose } }) as Record<string, unknown>;
			flushSync();
			const toggle = () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', [modifier]: true })); flushSync(); };
			toggle();
			const input = target.querySelector<HTMLInputElement>('input')!;
			input.value = 'workflow';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			flushSync();
			await vi.advanceTimersByTimeAsync(300);
			flushSync();
			expect(target.textContent).toContain('Persisted result');
			toggle();
			expect(target.querySelector('[role="dialog"]')).toBeNull();
			expect(onclose).not.toHaveBeenCalled();
			toggle();
			expect(target.querySelector<HTMLInputElement>('input')?.value).toBe('workflow');
			expect(target.textContent).toContain('Persisted result');
			expect(fetch).toHaveBeenCalledTimes(1);
		});

		it(`notifies the custom content owner on ${modifier} close`, () => {
			const onclose = vi.fn();
			target = document.createElement('div');
			document.body.appendChild(target);
			const content = createRawSnippet(() => ({ render: () => '<div>Custom search content</div>' }));
			instance = mount(UnifiedSearch, { target, props: { enableAnalytics: false, content, onclose } }) as Record<string, unknown>;
			flushSync();
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', [modifier]: true }));
			flushSync();
			expect(target.textContent).toContain('Custom search content');
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', [modifier]: true }));
			flushSync();
			expect(target.querySelector('[role="dialog"]')).toBeNull();
			expect(onclose).toHaveBeenCalledTimes(1);
		});
	}
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
