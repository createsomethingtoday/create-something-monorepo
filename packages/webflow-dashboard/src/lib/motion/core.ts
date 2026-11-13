/**
 * Motion core for the Asset Dashboard.
 *
 * One GSAP instance, one set of timings and one reduced-motion gate, so every
 * component moves the same way. Motion here explains a state or a
 * relationship (something arrived, moved, opened, or belongs to the pointer);
 * plain color hovers stay in CSS.
 *
 * Contract with app.html and app.css:
 *  - app.html adds `js-motion` to <html> before first paint when the visitor
 *    has not asked for reduced motion.
 *  - app.css makes `[data-reveal]` transparent under `js-motion` so
 *    server-rendered content does not flash before its entrance.
 *  - `bootMotion()` marks the page as booted. If it never runs (script error,
 *    blocked chunk) the app.html failsafe removes `js-motion` and everything
 *    shows, unanimated.
 */
import { browser } from '$app/environment';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

if (browser) {
	gsap.registerPlugin(ScrollTrigger, Flip, SplitText);
	gsap.defaults({ ease: 'power3.out', duration: 0.5 });
}

export { gsap, Flip, ScrollTrigger, SplitText };

/** Durations in seconds. Keep entrances short: this is a work tool. */
export const DUR = { micro: 0.16, fast: 0.26, base: 0.5, slow: 0.8 } as const;

export const EASE = {
	out: 'power3.out',
	inOut: 'power2.inOut',
	soft: 'power2.out',
	settle: 'back.out(1.7)'
} as const;

export function motionOK(): boolean {
	return browser && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True on devices with a real hovering pointer (not touch). */
export function finePointer(): boolean {
	return browser && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

declare global {
	interface Window {
		__motionBooted?: boolean;
	}
}

/** Called once from the root layout. Tells the app.html failsafe we are alive. */
export function bootMotion(): void {
	if (!browser) return;
	window.__motionBooted = true;
	if (!motionOK()) document.documentElement.classList.remove('js-motion');
}
