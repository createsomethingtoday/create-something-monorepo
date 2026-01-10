/**
 * Canon Motion Transitions
 *
 * Svelte transitions implementing Heideggerian motion philosophy:
 * - Zuhandenheit (Ready-to-hand): Motion recedes into transparent use
 * - Vorhandenheit (Present-at-hand): Motion obstructs, calling attention
 *
 * These transitions serve "disclosure" (reveal state/relationships), not decoration.
 */

import { cubicOut, cubicIn, cubicInOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

// Canon duration tokens (in ms)
export const duration = {
	instant: 100,
	micro: 150,
	fast: 200,
	standard: 300,
	complex: 500,
	slow: 700
} as const;

// Canon easing functions
export const ease = {
	standard: cubicOut, // Natural deceleration - most common
	decelerate: cubicOut, // Gentle landing - elements arriving
	accelerate: cubicIn, // For exits - elements leaving
	sharp: cubicInOut // Punchy - state changes
} as const;

/**
 * Fade transition with Canon timing
 * Use for: overlays, modals, subtle state changes
 */
export function fadeCanon(
	node: Element,
	{ delay = 0, duration: d = duration.fast }: { delay?: number; duration?: number } = {}
): TransitionConfig {
	const o = +getComputedStyle(node).opacity;
	return {
		delay,
		duration: d,
		easing: ease.standard,
		css: (t) => `opacity: ${t * o}`
	};
}

/**
 * Slide up transition - elements emerging from below
 * Use for: list items, cards appearing, content reveals
 */
export function slideUp(
	node: Element,
	{
		delay = 0,
		duration: d = duration.standard,
		distance = 16
	}: { delay?: number; duration?: number; distance?: number } = {}
): TransitionConfig {
	const style = getComputedStyle(node);
	const opacity = +style.opacity;
	const transform = style.transform === 'none' ? '' : style.transform;

	return {
		delay,
		duration: d,
		easing: ease.decelerate,
		css: (t, u) => `
			transform: ${transform} translateY(${u * distance}px);
			opacity: ${t * opacity}
		`
	};
}

/**
 * Slide down transition - elements receding upward
 * Use for: elements exiting, dismissals
 */
export function slideDown(
	node: Element,
	{
		delay = 0,
		duration: d = duration.fast,
		distance = 12
	}: { delay?: number; duration?: number; distance?: number } = {}
): TransitionConfig {
	const style = getComputedStyle(node);
	const opacity = +style.opacity;
	const transform = style.transform === 'none' ? '' : style.transform;

	return {
		delay,
		duration: d,
		easing: ease.accelerate,
		css: (t, u) => `
			transform: ${transform} translateY(${-u * distance}px);
			opacity: ${t * opacity}
		`
	};
}

/**
 * Scale transition - subtle size change for emphasis
 * Use for: button presses, card hover states, focus
 */
export function scaleCanon(
	node: Element,
	{
		delay = 0,
		duration: d = duration.micro,
		start = 0.97
	}: { delay?: number; duration?: number; start?: number } = {}
): TransitionConfig {
	const style = getComputedStyle(node);
	const opacity = +style.opacity;
	const transform = style.transform === 'none' ? '' : style.transform;

	return {
		delay,
		duration: d,
		easing: ease.sharp,
		css: (t) => `
			transform: ${transform} scale(${start + (1 - start) * t});
			opacity: ${opacity}
		`
	};
}

/**
 * Expand transition - content revealing from collapsed state
 * Use for: accordions, dropdowns, expandable sections
 */
export function expand(
	node: Element,
	{ delay = 0, duration: d = duration.standard }: { delay?: number; duration?: number } = {}
): TransitionConfig {
	const style = getComputedStyle(node);
	const height = parseFloat(style.height);
	const paddingTop = parseFloat(style.paddingTop);
	const paddingBottom = parseFloat(style.paddingBottom);
	const opacity = +style.opacity;

	return {
		delay,
		duration: d,
		easing: ease.standard,
		css: (t) => `
			height: ${t * height}px;
			padding-top: ${t * paddingTop}px;
			padding-bottom: ${t * paddingBottom}px;
			opacity: ${t * opacity};
			overflow: hidden;
		`
	};
}

/**
 * Stagger helper - calculates delay for staggered animations
 * Use with slideUp for list/grid items
 */
export function staggerDelay(index: number, baseDelay = 0, staggerMs = 50): number {
	return baseDelay + index * staggerMs;
}

/**
 * Disclosure transition - the canonical Canon transition
 * Combines subtle scale + fade for state disclosure
 * Use for: primary content, important state changes
 */
export function disclosure(
	node: Element,
	{
		delay = 0,
		duration: d = duration.standard
	}: { delay?: number; duration?: number } = {}
): TransitionConfig {
	const style = getComputedStyle(node);
	const opacity = +style.opacity;
	const transform = style.transform === 'none' ? '' : style.transform;

	return {
		delay,
		duration: d,
		easing: ease.decelerate,
		css: (t, u) => `
			transform: ${transform} scale(${0.98 + 0.02 * t}) translateY(${u * 8}px);
			opacity: ${t * opacity}
		`
	};
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get duration respecting reduced motion preference
 * Returns 0 for instant transitions when reduced motion is preferred
 */
export function getAccessibleDuration(d: number): number {
	return prefersReducedMotion() ? 0 : d;
}
