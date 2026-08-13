// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MeridianCardGrid from './MeridianCardGrid.svelte';
import MeridianEvidenceCarousel from './MeridianEvidenceCarousel.svelte';

let target: HTMLElement;
let instance: Record<string, unknown> | undefined;

afterEach(() => {
  if (instance) {
    unmount(instance as never);
    instance = undefined;
  }
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('MeridianCardGrid', () => {
  it('makes a linked delivery card one large, named touch target', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(MeridianCardGrid, {
      target,
      props: {
        title: 'Delivery paths',
        cards: [
          {
            title: 'Map one workflow',
            description: 'Start with the handoff that matters.',
            href: '/map',
            ctaLabel: 'Start the map'
          }
        ]
      }
    }) as Record<string, unknown>;
    flushSync();

    const card = target.querySelector('.meridian-card-grid__grid > a.meridian-card');
    expect(card?.getAttribute('href')).toBe('/map');
    expect(card?.getAttribute('aria-label')).toBe('Start the map: Map one workflow');
    expect(card?.querySelector('a')).toBeNull();
  });
});

describe('MeridianEvidenceCarousel', () => {
  it('sets its boundary controls from the rendered rail on mount', async () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(MeridianEvidenceCarousel, {
      target,
      props: {
        title: 'Evidence',
        items: [
          { eyebrow: 'Map', title: 'First', detail: 'First detail', source: 'Source one' },
          { eyebrow: 'Build', title: 'Second', detail: 'Second detail', source: 'Source two' }
        ]
      }
    }) as Record<string, unknown>;
    flushSync();

    const rail = target.querySelector<HTMLDivElement>('.meridian-evidence__rail');
    Object.defineProperties(rail!, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 300 },
      scrollLeft: { configurable: true, value: 0, writable: true }
    });
    await Promise.resolve();
    flushSync();

    expect(target.querySelector<HTMLButtonElement>('[aria-label="Previous evidence"]')?.disabled).toBe(true);
    expect(target.querySelector<HTMLButtonElement>('[aria-label="Next evidence"]')?.disabled).toBe(true);
  });

  it('treats the leading snap inset as the first evidence position', async () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(MeridianEvidenceCarousel, {
      target,
      props: {
        title: 'Evidence',
        items: [
          { eyebrow: 'Map', title: 'First', detail: 'First detail', source: 'Source one' },
          { eyebrow: 'Build', title: 'Second', detail: 'Second detail', source: 'Source two' }
        ]
      }
    }) as Record<string, unknown>;
    flushSync();

    const rail = target.querySelector<HTMLDivElement>('.meridian-evidence__rail');
    rail!.style.paddingInlineStart = '12px';
    Object.defineProperties(rail!, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 600 },
      scrollLeft: { configurable: true, value: 12, writable: true }
    });
    await Promise.resolve();
    flushSync();

    expect(target.querySelector<HTMLButtonElement>('[aria-label="Previous evidence"]')?.disabled).toBe(true);
    expect(target.querySelector<HTMLButtonElement>('[aria-label="Next evidence"]')?.disabled).toBe(false);
  });

  it('remeasures when a previously hidden rail becomes visible', async () => {
    let resizeCallback: ResizeObserverCallback | undefined;
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(MeridianEvidenceCarousel, {
      target,
      props: {
        title: 'Evidence',
        items: [
          { eyebrow: 'Map', title: 'First', detail: 'First detail', source: 'Source one' },
          { eyebrow: 'Build', title: 'Second', detail: 'Second detail', source: 'Source two' }
        ]
      }
    }) as Record<string, unknown>;
    flushSync();

    const rail = target.querySelector<HTMLDivElement>('.meridian-evidence__rail');
    Object.defineProperties(rail!, {
      clientWidth: { configurable: true, value: 0 },
      scrollWidth: { configurable: true, value: 0 },
      scrollLeft: { configurable: true, value: 0, writable: true }
    });
    await Promise.resolve();
    flushSync();
    expect(target.querySelector<HTMLButtonElement>('[aria-label="Next evidence"]')?.disabled).toBe(true);

    Object.defineProperties(rail!, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 600 }
    });
    resizeCallback?.([], {} as ResizeObserver);
    await Promise.resolve();
    flushSync();

    expect(target.querySelector<HTMLButtonElement>('[aria-label="Previous evidence"]')?.disabled).toBe(true);
    expect(target.querySelector<HTMLButtonElement>('[aria-label="Next evidence"]')?.disabled).toBe(false);
  });

  it('communicates when the evidence rail cannot move farther', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(MeridianEvidenceCarousel, {
      target,
      props: {
        title: 'Evidence',
        items: [
          { eyebrow: 'Map', title: 'First', detail: 'First detail', source: 'Source one' },
          { eyebrow: 'Build', title: 'Second', detail: 'Second detail', source: 'Source two' },
          { eyebrow: 'Control', title: 'Third', detail: 'Third detail', source: 'Source three' }
        ]
      }
    }) as Record<string, unknown>;
    flushSync();

    const previous = target.querySelector<HTMLButtonElement>('[aria-label="Previous evidence"]');
    const next = target.querySelector<HTMLButtonElement>('[aria-label="Next evidence"]');
    expect(previous?.disabled).toBe(true);
    expect(next?.disabled).toBe(false);

    const rail = target.querySelector<HTMLDivElement>('.meridian-evidence__rail');
    Object.defineProperties(rail!, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 300 },
      scrollLeft: { configurable: true, value: 200, writable: true }
    });
    rail?.dispatchEvent(new Event('scroll'));
    flushSync();

    expect(next?.disabled).toBe(true);
  });

  it('scrolls one evidence card at a time', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(MeridianEvidenceCarousel, {
      target,
      props: {
        title: 'Evidence',
        items: [
          { eyebrow: 'Map', title: 'First', detail: 'First detail', source: 'Source one' },
          { eyebrow: 'Build', title: 'Second', detail: 'Second detail', source: 'Source two' }
        ]
      }
    }) as Record<string, unknown>;
    flushSync();

    const rail = target.querySelector<HTMLDivElement>('.meridian-evidence__rail');
    const scrollBy = vi.fn();
    Object.defineProperties(rail!, {
      clientWidth: { configurable: true, value: 240 },
      scrollWidth: { configurable: true, value: 480 },
      scrollLeft: { configurable: true, value: 0, writable: true },
      scrollBy: { configurable: true, value: scrollBy }
    });
    const next = target.querySelector<HTMLButtonElement>('[aria-label="Next evidence"]');
    next?.click();

    expect(scrollBy).toHaveBeenCalledWith({ left: 240, behavior: 'smooth' });
  });
});
