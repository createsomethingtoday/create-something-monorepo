// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scrollEntrance } from './scroll-entrance.js';

const motion = vi.hoisted(() => ({ fromTo: vi.fn(), registerPlugin: vi.fn(), ease: vi.fn(() => 'canon-ease') }));
vi.mock('gsap', () => ({ gsap: { fromTo: motion.fromTo, registerPlugin: motion.registerPlugin } }));
vi.mock('gsap/CustomEase', () => ({ CustomEase: { create: motion.ease } }));

describe('progressive GSAP scroll entrances', () => {
  let root: HTMLElement;
  let notify: (entries: IntersectionObserverEntry[]) => void;
  let preference: EventTarget & { matches: boolean };
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();
  const takeRecords = vi.fn<() => IntersectionObserverEntry[]>(() => []);
  const disposers: Array<() => void> = [];
  const tweens: Array<{ revert: ReturnType<typeof vi.fn>; complete: () => void }> = [];

  function target(top = 1200) {
    const element = document.createElement('div');
    element.dataset.scrollEntrance = '';
    element.innerHTML = '<a href="#">Inspect the work</a>';
    element.style.setProperty('--duration-performance-complex', '500ms');
    element.style.setProperty('--duration-performance-slow', '700ms');
    element.style.setProperty('--duration-performance-instant', '100ms');
    element.style.setProperty('--ease-performance-decelerate', 'cubic-bezier(0, 0, 0.2, 1)');
    element.style.setProperty('--ease-performance-standard', 'cubic-bezier(0.4, 0, 0.2, 1)');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect);
    root.append(element);
    return element;
  }

  function start() {
    const action = scrollEntrance(root);
    disposers.push(action.destroy);
    return action;
  }

  async function ready() { await vi.dynamicImportSettled(); }
  function enter(element: HTMLElement, top = 500, isIntersecting = true) {
    notify([{ target: element, isIntersecting, boundingClientRect: new DOMRect(0, top, 300, 200),
      intersectionRatio: isIntersecting ? 1 : 0, intersectionRect: new DOMRect(), rootBounds: null, time: 0 }]);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    tweens.length = 0;
    history.replaceState(null, '', location.pathname);
    root = document.createElement('main');
    document.body.append(root);
    preference = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('matchMedia', vi.fn(() => preference));
    vi.stubGlobal('IntersectionObserver', class {
      observe = observe; unobserve = unobserve; disconnect = disconnect; takeRecords = takeRecords;
      constructor(callback: typeof notify) { notify = callback; }
    });
    const getStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
      const style = getStyle(element);
      if (!style.transform) Object.defineProperty(style, 'transform', { value: 'none' });
      return style;
    });
    motion.fromTo.mockImplementation((element: HTMLElement, _from, to) => {
      const original = element.getAttribute('style');
      element.style.opacity = '0.25';
      element.style.transform = 'translateY(16px)';
      const tween = { revert: vi.fn(() => {
        if (original === null) element.removeAttribute('style'); else element.setAttribute('style', original);
      }), complete: to.onComplete };
      tweens.push(tween);
      return tween;
    });
  });
  afterEach(() => {
    disposers.splice(0).forEach(dispose => dispose());
    root.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps waiting content visible and uses GSAP with Canon duration and easing once', async () => {
    const element = target();
    start();
    expect(element.style.opacity).toBe('');
    expect(element.style.transform).toBe('');
    await ready();
    enter(element, 500, false);
    expect(motion.fromTo).not.toHaveBeenCalled();
    enter(element);
    expect(motion.fromTo).toHaveBeenCalledWith(element, { opacity: 0.4, y: 16 }, expect.objectContaining({ opacity: 1, y: 0, delay: 0.1, ease: 'canon-ease' }));
    expect(motion.fromTo.mock.calls[0][2].duration).toBeCloseTo(0.7);
    expect(motion.ease).toHaveBeenCalledWith('', '0.4, 0, 0.2, 1');
    expect(unobserve).toHaveBeenCalledWith(element);
    enter(element);
    expect(motion.fromTo).toHaveBeenCalledOnce();
    tweens[0].complete();
    expect(tweens[0].revert).toHaveBeenCalledOnce();
    expect(element.style.opacity).toBe('');
    expect(element.style.transform).toBe('');
  });

  it('never animates a group viewed and left before the GSAP import resolves', async () => {
    const seenWhileLoading = target();
    const unseen = target();
    start();
    // Native observer delivery can precede the asynchronous GSAP runtime.
    // The reader sees this group, then returns above it while loading continues.
    enter(seenWhileLoading);
    expect(seenWhileLoading.style.opacity).toBe('');
    await vi.dynamicImportSettled();
    enter(seenWhileLoading);
    expect(motion.fromTo).not.toHaveBeenCalled();
    enter(unseen);
    expect(motion.fromTo).toHaveBeenCalledOnce();
    expect(motion.fromTo.mock.calls[0][0]).toBe(unseen);
  });

  it('keeps briefly viewed groups settled when visibility delivery trails import resolution', async () => {
    const seen = target();
    start();
    takeRecords.mockReturnValueOnce([{ target: seen, isIntersecting: true,
      boundingClientRect: new DOMRect(0, 700, 300, 200), intersectionRatio: 0.5,
      intersectionRect: new DOMRect(), rootBounds: null, time: 0 }]);
    await ready();
    enter(seen);
    expect(motion.fromTo).not.toHaveBeenCalled();
    expect(seen.style.opacity).toBe('');
  });

  it('keeps direct hash arrivals and reduced-motion mounts immediate', async () => {
    target();
    history.replaceState(null, '', '#built-work'); start();
    history.replaceState(null, '', location.pathname);
    preference.matches = true; start();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(observe).not.toHaveBeenCalled();
    expect(motion.fromTo).not.toHaveBeenCalled();
  });

  it('skips initial viewport, restored content, nested targets and existing transforms', async () => {
    const visible = target(100); const above = target(-300);
    const parent = target(); const child = target(); parent.append(child);
    const transformed = target(); transformed.style.transform = 'translateX(3px)';
    start(); await ready();
    expect(observe).not.toHaveBeenCalledWith(visible);
    expect(observe).not.toHaveBeenCalledWith(above);
    expect(observe).not.toHaveBeenCalledWith(child);
    enter(parent); enter(transformed);
    expect(motion.fromTo).toHaveBeenCalledTimes(1);
    expect(transformed.style.transform).toBe('translateX(3px)');
  });

  it('settles pending and active targets immediately on keyboard focus', async () => {
    const pending = target(); const active = target();
    start(); await ready(); enter(active);
    pending.querySelector('a')!.focus(); enter(pending);
    active.querySelector('a')!.focus();
    expect(motion.fromTo).toHaveBeenCalledOnce();
    expect(tweens[0].revert).toHaveBeenCalledOnce();
    expect(active.style.opacity).toBe('');
    expect(document.activeElement).toBe(active.querySelector('a'));
  });

  it.each(['reduced motion', 'hash navigation', 'destroy'])('settles active/pending targets for %s', async kind => {
    const active = target(); const pending = target();
    const removeRoot = vi.spyOn(root, 'removeEventListener');
    const action = start(); await ready(); enter(active);
    if (kind === 'reduced motion') { preference.matches = true; preference.dispatchEvent(new Event('change')); }
    else if (kind === 'hash navigation') { history.replaceState(null, '', '#built-work'); window.dispatchEvent(new HashChangeEvent('hashchange')); }
    else { action.destroy(); expect(disconnect).toHaveBeenCalledTimes(2); expect(removeRoot).toHaveBeenCalledWith('focusin', expect.any(Function)); }
    expect(tweens[0].revert).toHaveBeenCalledOnce();
    expect(active.style.opacity).toBe('');
    preference.matches = false;
    enter(pending);
    expect(motion.fromTo).toHaveBeenCalledOnce();
  });

  it('does not initialize late after destroy or a focus/hash/preference change during import', async () => {
    const element = target();
    const action = start(); action.destroy();
    observe.mockClear();
    await vi.dynamicImportSettled();
    expect(observe).not.toHaveBeenCalled();
    start(); element.querySelector('a')!.focus();
    observe.mockClear();
    await vi.dynamicImportSettled();
    expect(observe).not.toHaveBeenCalled();
    const second = target(); start();
    preference.matches = true; preference.dispatchEvent(new Event('change'));
    observe.mockClear();
    await vi.dynamicImportSettled();
    expect(observe).not.toHaveBeenCalled();
    expect(second.style.opacity).toBe('');
  });

  it('settles rapid jumps above the viewport and leaves invalid duration readable', async () => {
    const jumped = target(); const invalid = target(); invalid.style.setProperty('--duration-performance-slow', 'invalid'); invalid.style.setProperty('--duration-performance-complex', 'invalid');
    start(); await ready(); enter(jumped, -50); enter(invalid);
    expect(motion.fromTo).not.toHaveBeenCalled();
    expect(invalid.style.opacity).toBe('');
  });

  it('fails open when loading the animation runtime fails', async () => {
    const element = target();
    motion.registerPlugin.mockImplementationOnce(() => { throw new Error('Runtime unavailable'); });
    start();
    await vi.dynamicImportSettled();
    expect(observe).toHaveBeenCalledWith(element);
    expect(unobserve).toHaveBeenCalledWith(element);
    enter(element);
    expect(motion.fromTo).not.toHaveBeenCalled();
    expect(element.style.opacity).toBe('');
    expect(element.style.transform).toBe('');
  });

  it('leaves content readable when browser observation is unavailable or GSAP rejects a tween', async () => {
    const element = target();
    vi.stubGlobal('IntersectionObserver', undefined);
    expect(() => start()).not.toThrow();
    expect(element.style.opacity).toBe('');
    vi.unstubAllGlobals();
    vi.stubGlobal('matchMedia', vi.fn(() => preference));
    vi.stubGlobal('IntersectionObserver', class { observe = observe; unobserve = unobserve; disconnect = disconnect; takeRecords = takeRecords; constructor(callback: typeof notify) { notify = callback; } });
    motion.fromTo.mockImplementation((target: HTMLElement) => {
      target.style.opacity = '0.25';
      target.style.transform = 'translateY(16px)';
      throw new Error('Unavailable');
    });
    start(); await ready();
    expect(() => enter(element)).not.toThrow();
    expect(element.style.opacity).toBe('');
    expect(element.style.transform).toBe('');
  });
});
