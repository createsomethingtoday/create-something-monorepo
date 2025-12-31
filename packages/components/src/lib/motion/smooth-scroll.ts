/**
 * SmoothScroll shared types and utilities
 */
import { writable, type Writable } from 'svelte/store';

/** Scroll state exposed to child components */
export interface ScrollState {
	/** Current scroll position (0-1) */
	progress: number;
	/** Current scroll Y in pixels */
	scrollY: number;
	/** Scroll direction: 1 = down, -1 = up, 0 = stopped */
	direction: number;
	/** Scroll velocity (pixels per frame) */
	velocity: number;
	/** Whether currently scrolling */
	isScrolling: boolean;
}

/** Context key for scroll state */
export const SMOOTH_SCROLL_KEY = Symbol('smooth-scroll');

/** Create a scroll state store */
export function createScrollState(): Writable<ScrollState> {
	return writable<ScrollState>({
		progress: 0,
		scrollY: 0,
		direction: 0,
		velocity: 0,
		isScrolling: false
	});
}
