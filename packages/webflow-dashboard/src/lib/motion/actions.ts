/**
 * Svelte actions and transitions built on the motion core.
 *
 * Every export is safe to use unconditionally: with reduced motion (or on the
 * server) each one is a no-op that leaves content visible.
 */
import type { Action } from 'svelte/action';
import type { TransitionConfig } from 'svelte/transition';
import { DUR, EASE, ScrollTrigger, SplitText, finePointer, gsap, motionOK } from './core';

/* -------------------------------------------------------------------------- */
/* Reveal: page-load and scroll entrance                                       */
/* -------------------------------------------------------------------------- */

export type RevealKind = 'rise' | 'fade' | 'lines';

export interface RevealOptions {
	kind?: RevealKind;
	/** Extra delay in seconds, on top of the batch stagger. */
	delay?: number;
}

interface PendingReveal {
	node: HTMLElement;
	options: RevealOptions;
}

let pending: PendingReveal[] = [];
let flushQueued = false;

// Reveal targets are hidden with opacity only, never `visibility` or `display`:
// content waiting below the fold must stay in the tab order, in the
// accessibility tree and findable with in-page search.
function show(node: HTMLElement) {
	gsap.killTweensOf(node);
	gsap.set(node, { clearProps: 'transform,opacity' });
	node.dataset.revealed = 'true';
}

function play({ node, options }: PendingReveal, index: number) {
	const delay = index * 0.05 + (options.delay ?? 0);
	node.dataset.revealed = 'true';

	if (options.kind === 'lines') {
		gsap.set(node, { clearProps: 'opacity' });
		SplitText.create(node, {
			type: 'lines',
			mask: 'lines',
			autoSplit: true,
			onSplit: (self) =>
				gsap.from(self.lines, {
					yPercent: 105,
					duration: 0.6,
					ease: EASE.out,
					stagger: 0.07,
					delay,
					onComplete: () => self.revert()
				})
		});
		return;
	}

	gsap.fromTo(
		node,
		{ opacity: 0, y: options.kind === 'fade' ? 0 : 18 },
		{
			opacity: 1,
			y: 0,
			duration: DUR.base,
			ease: EASE.out,
			delay,
			clearProps: 'transform,opacity'
		}
	);
}

function flush() {
	flushQueued = false;
	const batch = pending.filter(({ node }) => node.isConnected);
	pending = [];
	if (batch.length === 0) return;

	// Document order, so a batch staggers top to bottom across components.
	batch.sort((a, b) =>
		a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
	);
	const byNode = new Map(batch.map((entry) => [entry.node as Element, entry]));

	ScrollTrigger.batch(
		batch.map(({ node }) => node),
		{
			start: 'top 97%',
			once: true,
			interval: 0.08,
			batchMax: 12,
			onEnter: (elements) =>
				elements.forEach((element, index) => {
					const entry = byNode.get(element);
					if (entry) play(entry, index);
				})
		}
	);
}

/**
 * Entrance for an element: plays on page load when it starts in view, or when
 * it scrolls into view. Pair with a `data-reveal` attribute in the markup so
 * server-rendered content is hidden before first paint (see app.css).
 */
export const reveal: Action<HTMLElement, RevealOptions | undefined> = (node, options) => {
	if (!motionOK()) {
		node.dataset.revealed = 'true';
		return;
	}

	gsap.set(node, { opacity: 0 });
	pending.push({ node, options: options ?? {} });
	if (!flushQueued) {
		flushQueued = true;
		requestAnimationFrame(flush);
	}

	const stop = () => {
		pending = pending.filter((entry) => entry.node !== node);
		ScrollTrigger.getAll()
			.filter((trigger) => trigger.trigger === node)
			.forEach((trigger) => trigger.kill());
	};
	// Keyboard focus landing inside a waiting element shows it at once.
	const onFocus = () => {
		if (node.dataset.revealed) return;
		stop();
		show(node);
	};
	node.addEventListener('focusin', onFocus);

	return {
		destroy() {
			node.removeEventListener('focusin', onFocus);
			stop();
			show(node);
		}
	};
};

/* -------------------------------------------------------------------------- */
/* Count up: numbers arrive with their card                                    */
/* -------------------------------------------------------------------------- */

export interface CountOptions {
	value: number;
	format: (value: number) => string;
}

/**
 * Keeps a figure honest and steady: it shows the real value from first paint
 * (no count-up from a wrong number on load) and only tweens when the value
 * itself changes, for example after a refresh.
 */
export const countUp: Action<HTMLElement, CountOptions> = (node, options) => {
	let current = options;
	const state = { value: options.value };
	const render = () => (node.textContent = current.format(state.value));

	return {
		update(next) {
			const changed = next.value !== current.value;
			current = next;
			if (!changed || !motionOK()) {
				state.value = next.value;
				render();
				return;
			}
			gsap.to(state, {
				value: next.value,
				duration: DUR.base,
				ease: 'power2.out',
				overwrite: true,
				onUpdate: render
			});
		},
		destroy() {
			gsap.killTweensOf(state);
		}
	};
};

/* -------------------------------------------------------------------------- */
/* Grow: bars and meters fill from their origin when seen                      */
/* -------------------------------------------------------------------------- */

export interface GrowOptions {
	axis?: 'x' | 'y';
	delay?: number;
	/** Child selector to stagger instead of growing the node itself. */
	children?: string;
}

export const grow: Action<HTMLElement, GrowOptions | undefined> = (node, options) => {
	if (!motionOK()) return;
	const axis = options?.axis ?? 'x';
	const targets = options?.children ? Array.from(node.querySelectorAll(options.children)) : [node];
	if (targets.length === 0) return;
	const prop = axis === 'x' ? 'scaleX' : 'scaleY';
	const origin = axis === 'x' ? 'left center' : 'center bottom';

	gsap.set(targets, { [prop]: 0, transformOrigin: origin });
	const tween = gsap.to(targets, {
		[prop]: 1,
		duration: DUR.slow,
		ease: 'power3.inOut',
		stagger: 0.08,
		delay: options?.delay ?? 0.2,
		clearProps: 'transform',
		scrollTrigger: { trigger: node, start: 'top 94%', once: true }
	});

	return {
		destroy() {
			tween.scrollTrigger?.kill();
			tween.kill();
			gsap.set(targets, { clearProps: 'transform' });
		}
	};
};

/* -------------------------------------------------------------------------- */
/* Press: tactile click feedback                                               */
/* -------------------------------------------------------------------------- */

export const press: Action<HTMLElement> = (node) => {
	if (!motionOK()) return;

	const down = () => gsap.to(node, { scale: 0.965, duration: DUR.micro, ease: EASE.soft, overwrite: 'auto' });
	const up = () =>
		gsap.to(node, {
			scale: 1,
			duration: 0.42,
			ease: EASE.settle,
			overwrite: 'auto',
			clearProps: 'scale'
		});
	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') down();
	};

	node.addEventListener('pointerdown', down);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointerleave', up);
	node.addEventListener('pointercancel', up);
	node.addEventListener('keydown', onKey);
	node.addEventListener('keyup', up);

	return {
		destroy() {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointerleave', up);
			node.removeEventListener('pointercancel', up);
			node.removeEventListener('keydown', onKey);
			node.removeEventListener('keyup', up);
			gsap.killTweensOf(node);
		}
	};
};

/* -------------------------------------------------------------------------- */
/* Spotlight: the border under the pointer lights up                           */
/* -------------------------------------------------------------------------- */

/**
 * Tracks the pointer over a surface and exposes it as `--spot-x`, `--spot-y`
 * and `--spot-o`. The surface draws the light itself (see `.card` in Card).
 */
export const spotlight: Action<HTMLElement> = (node) => {
	if (!motionOK() || !finePointer()) return;

	const state = { x: 0, y: 0, o: 0 };
	const apply = () => {
		node.style.setProperty('--spot-x', `${state.x}px`);
		node.style.setProperty('--spot-y', `${state.y}px`);
		node.style.setProperty('--spot-o', String(state.o));
	};
	const toX = gsap.quickTo(state, 'x', { duration: 0.4, ease: EASE.out, onUpdate: apply });
	const toY = gsap.quickTo(state, 'y', { duration: 0.4, ease: EASE.out, onUpdate: apply });

	const local = (event: PointerEvent) => {
		const rect = node.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	};
	const move = (event: PointerEvent) => {
		const point = local(event);
		toX(point.x);
		toY(point.y);
	};
	const enter = (event: PointerEvent) => {
		Object.assign(state, local(event));
		gsap.to(state, { o: 1, duration: DUR.fast, ease: EASE.soft, overwrite: 'auto', onUpdate: apply });
	};
	const leave = () =>
		gsap.to(state, { o: 0, duration: DUR.base, ease: EASE.soft, overwrite: 'auto', onUpdate: apply });

	node.addEventListener('pointerenter', enter);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);

	return {
		destroy() {
			node.removeEventListener('pointerenter', enter);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
			gsap.killTweensOf(state);
		}
	};
};

/* -------------------------------------------------------------------------- */
/* Disclosure: open and close a region whose height is not known               */
/* -------------------------------------------------------------------------- */

const hold = (seconds: number): TransitionConfig => ({ duration: seconds * 1000, tick: () => {} });

/** `in:` transition. GSAP runs the tween; Svelte only keeps the node mounted. */
export function expandIn(node: HTMLElement, { stagger }: { stagger?: string } = {}): TransitionConfig {
	if (!motionOK()) return { duration: 0 };
	const duration = 0.32;
	// The height opens with its content already visible: no empty box first.
	gsap.fromTo(
		node,
		{ height: 0, overflow: 'hidden' },
		{ height: 'auto', duration, ease: EASE.out, clearProps: 'height,overflow' }
	);
	if (stagger) {
		gsap.from(node.querySelectorAll(stagger), {
			opacity: 0,
			y: 8,
			duration: DUR.fast,
			stagger: 0.03,
			ease: EASE.out,
			clearProps: 'transform,opacity'
		});
	}
	return hold(duration);
}

/** `out:` transition, the reverse of `expandIn`. */
export function collapseOut(node: HTMLElement): TransitionConfig {
	if (!motionOK()) return { duration: 0 };
	const duration = 0.24;
	gsap.to(node, { height: 0, overflow: 'hidden', duration, ease: EASE.inOut });
	return hold(duration);
}

/*
 * Floating surfaces (menu, dialog, toast) fade with opacity only, never
 * `visibility`. Dialog and the row menu move keyboard focus into themselves as
 * they open; an element that is `visibility: hidden`, even for one frame,
 * cannot take focus, and the attempt is not retried.
 */

/** `in:` transition for a floating surface (menu, dialog panel, toast). */
export function popIn(
	node: HTMLElement,
	{ y = 8, scale = 0.96, origin = 'top right' }: { y?: number; scale?: number; origin?: string } = {}
): TransitionConfig {
	if (!motionOK()) return { duration: 0 };
	const duration = 0.32;
	gsap.fromTo(
		node,
		{ opacity: 0, y, scale, transformOrigin: origin },
		{ opacity: 1, y: 0, scale: 1, duration, ease: EASE.out, clearProps: 'transform,opacity' }
	);
	return hold(duration);
}

export function popOut(node: HTMLElement, { y = 6 }: { y?: number } = {}): TransitionConfig {
	if (!motionOK()) return { duration: 0 };
	const duration = 0.18;
	gsap.to(node, { opacity: 0, y, scale: 0.98, duration, ease: 'power2.in' });
	return hold(duration);
}

export function fadeIn(node: HTMLElement): TransitionConfig {
	if (!motionOK()) return { duration: 0 };
	gsap.fromTo(
		node,
		{ opacity: 0 },
		{ opacity: 1, duration: DUR.fast, ease: 'none', clearProps: 'opacity' }
	);
	return hold(DUR.fast);
}

export function fadeOut(node: HTMLElement): TransitionConfig {
	if (!motionOK()) return { duration: 0 };
	gsap.to(node, { opacity: 0, duration: 0.2, ease: 'none' });
	return hold(0.2);
}

/** `in:` transition for content that replaces other content in place (tab panels). */
export function swapIn(node: HTMLElement): TransitionConfig {
	if (!motionOK()) return { duration: 0 };
	const duration = 0.34;
	gsap.fromTo(
		node,
		{ opacity: 0, y: 8 },
		{ opacity: 1, y: 0, duration, ease: EASE.out, clearProps: 'transform,opacity' }
	);
	return hold(duration);
}

/* -------------------------------------------------------------------------- */
/* Pan: move the pointer down a tall, cropped image to see the rest of it      */
/* -------------------------------------------------------------------------- */

export const pan: Action<HTMLImageElement> = (node) => {
	if (!motionOK() || !finePointer()) return;

	const state = { y: 0 };
	const apply = () => (node.style.objectPosition = `50% ${state.y}%`);
	const toY = gsap.quickTo(state, 'y', { duration: 0.6, ease: EASE.out, onUpdate: apply });

	const move = (event: PointerEvent) => {
		const rect = node.getBoundingClientRect();
		// A margin at each end, so the top and bottom of the image are easy to reach.
		const progress = (event.clientY - rect.top - rect.height * 0.12) / (rect.height * 0.76);
		toY(gsap.utils.clamp(0, 100, progress * 100));
	};
	const leave = () => toY(0);

	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);

	return {
		destroy() {
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
			gsap.killTweensOf(state);
		}
	};
};
