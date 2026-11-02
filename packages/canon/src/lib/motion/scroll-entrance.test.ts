// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scrollEntrance } from './scroll-entrance.js';

describe('progressive scroll entrances', () => {
	let root: HTMLElement;
	let notify: (entries: IntersectionObserverEntry[]) => void;
	let preference: EventTarget & { matches: boolean };
	const observe = vi.fn();
	const unobserve = vi.fn();
	const disconnect = vi.fn();
	const disposers: Array<() => void> = [];

	function target(top = 1200) {
		const element = document.createElement('div');
		element.dataset.scrollEntrance = '';
		element.innerHTML = '<a href="#">Inspect the work</a>';
		element.style.setProperty('--duration-performance-complex', '500ms');
		element.style.setProperty('--ease-performance-decelerate', 'cubic-bezier(0, 0, 0.2, 1)');
		vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect);
		const cancel = vi.fn();
		const animate = vi.fn(() => ({ cancel, finished: new Promise(() => {}) }) as unknown as Animation);
		Object.defineProperty(element, 'animate', { configurable: true, value: animate });
		root.append(element);
		return { element, animate, cancel };
	}

	function start() {
		const action = scrollEntrance(root);
		disposers.push(action.destroy);
		return action;
	}

	function enter(element: HTMLElement, top = 500, isIntersecting = true) {
		notify([{ target: element, isIntersecting, boundingClientRect: new DOMRect(0, top, 300, 200),
			intersectionRatio: isIntersecting ? 1 : 0, intersectionRect: new DOMRect(), rootBounds: null, time: 0 }]);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		root = document.createElement('main');
		document.body.append(root);
		preference = Object.assign(new EventTarget(), { matches: false });
		vi.stubGlobal('matchMedia', vi.fn(() => preference));
		vi.stubGlobal('IntersectionObserver', class {
			observe = observe;
			unobserve = unobserve;
			disconnect = disconnect;
			constructor(callback: (entries: IntersectionObserverEntry[]) => void) { notify = callback; }
		});
		const getStyle = window.getComputedStyle.bind(window);
		vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
			const style = getStyle(element);
			// Browsers return `none`; jsdom leaves the initial transform empty.
			if (!style.transform) Object.defineProperty(style, 'transform', { value: 'none' });
			return style;
		});
	});

	afterEach(() => {
		disposers.splice(0).forEach(dispose => dispose());
		root.remove();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('keeps authored content visible while waiting, then enters only once', () => {
		const { element, animate } = target();
		expect(element.style.opacity).toBe('');
		start();
		expect(element.style.opacity).toBe('');
		expect(element.style.transform).toBe('');
		expect(observe).toHaveBeenCalledWith(element);
		enter(element, 500, false);
		expect(animate).not.toHaveBeenCalled();
		enter(element);
		expect(animate).toHaveBeenCalledWith(
			[{ opacity: 0.25, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }],
			{ duration: 500, easing: 'cubic-bezier(0, 0, 0.2, 1)' }
		);
		expect(unobserve).toHaveBeenCalledWith(element);
		enter(element);
		expect(animate).toHaveBeenCalledTimes(1);
	});

	it('keeps a direct hash arrival immediate', () => {
		const item = target();
		history.replaceState(null, '', '#built-work');
		start();
		expect(observe).not.toHaveBeenCalled();
		expect(item.animate).not.toHaveBeenCalled();
		history.replaceState(null, '', location.pathname);
	});

	it('does not replay the initial viewport or restored content above it', () => {
		const visible = target(100);
		const above = target(-300);
		start();
		expect(observe).not.toHaveBeenCalled();
		expect(visible.animate).not.toHaveBeenCalled();
		expect(above.animate).not.toHaveBeenCalled();
	});

	it('settles both pending and active targets immediately when their links receive focus', () => {
		const pending = target();
		const active = target();
		start();
		enter(active.element);
		pending.element.querySelector('a')!.focus();
		enter(pending.element);
		expect(pending.animate).not.toHaveBeenCalled();
		active.element.querySelector('a')!.focus();
		expect(active.cancel).toHaveBeenCalledOnce();
		expect(document.activeElement).toBe(active.element.querySelector('a'));
	});

	it('honors reduced motion at mount and when the preference changes during motion', () => {
		const first = target();
		preference.matches = true;
		start();
		expect(observe).not.toHaveBeenCalled();
		expect(first.animate).not.toHaveBeenCalled();
		preference.matches = false;
		const active = target();
		const pending = target();
		start();
		enter(active.element);
		preference.matches = true;
		preference.dispatchEvent(new Event('change'));
		expect(active.cancel).toHaveBeenCalledOnce();
		enter(pending.element);
		expect(pending.animate).not.toHaveBeenCalled();
		preference.matches = false;
		preference.dispatchEvent(new Event('change'));
		enter(pending.element);
		expect(pending.animate).not.toHaveBeenCalled();
	});

	it('settles rapid jumps above the viewport and preserves an existing transform', () => {
		const jumped = target();
		const transformed = target();
		transformed.element.style.transform = 'translateX(3px)';
		start();
		enter(jumped.element, -50);
		enter(transformed.element);
		expect(jumped.animate).not.toHaveBeenCalled();
		expect(transformed.animate).not.toHaveBeenCalled();
		expect(transformed.element.style.transform).toBe('translateX(3px)');
	});

	it('does not animate nested groups twice', () => {
		const parent = target();
		const child = target();
		parent.element.append(child.element);
		start();
		expect(observe).toHaveBeenCalledWith(parent.element);
		expect(observe).not.toHaveBeenCalledWith(child.element);
	});

	it('settles pending and active groups for native hash navigation to an empty anchor', () => {
		const active = target();
		const pending = target();
		start();
		enter(active.element);
		history.replaceState(null, '', '#built-work');
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		expect(active.cancel).toHaveBeenCalledOnce();
		enter(pending.element);
		expect(pending.animate).not.toHaveBeenCalled();
		history.replaceState(null, '', location.pathname);
	});

	it('disconnects observers, cancels animations and removes event listeners on destroy', () => {
		const active = target();
		const pending = target();
		const removeRoot = vi.spyOn(root, 'removeEventListener');
		const removeWindow = vi.spyOn(window, 'removeEventListener');
		const removePreference = vi.spyOn(preference, 'removeEventListener');
		const action = start();
		enter(active.element);
		action.destroy();
		expect(active.cancel).toHaveBeenCalledOnce();
		expect(disconnect).toHaveBeenCalledOnce();
		expect(unobserve).toHaveBeenCalledWith(pending.element);
		expect(removeRoot).toHaveBeenCalledWith('focusin', expect.any(Function));
		expect(removeWindow).toHaveBeenCalledWith('hashchange', expect.any(Function));
		expect(removePreference).toHaveBeenCalledWith('change', expect.any(Function));
		enter(pending.element);
		expect(pending.animate).not.toHaveBeenCalled();
	});

	it('leaves content readable when browser observation or animation APIs are unavailable', () => {
		const missingAnimation = target();
		Object.defineProperty(missingAnimation.element, 'animate', { value: undefined });
		start();
		expect(observe).not.toHaveBeenCalled();
		const item = target();
		vi.stubGlobal('IntersectionObserver', undefined);
		expect(() => start()).not.toThrow();
		expect(item.element.style.opacity).toBe('');
		vi.stubGlobal('matchMedia', undefined);
		expect(() => start()).not.toThrow();
	});

	it('falls back to visible content if the browser rejects an animation', () => {
		const item = target();
		item.animate.mockImplementation(() => { throw new Error('Animation unavailable'); });
		start();
		expect(() => enter(item.element)).not.toThrow();
		expect(item.element.style.opacity).toBe('');
		expect(item.element.style.transform).toBe('');
	});
});
