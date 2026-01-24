/**
 * Custom Svelte transitions for UI viewer animations
 * 
 * Aligned with Canon timing tokens:
 * - duration-micro: 200ms
 * - duration-standard: 300ms  
 * - duration-complex: 500ms
 */

import { cubicOut, elasticOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

/**
 * Pulse transition - scales and fades with a glow effect
 * Used for newly inserted elements
 * 
 * Uses Canon --duration-standard (300ms) as default
 */
export function pulse(
	node: Element,
	{ duration = 300, delay = 0 }: { duration?: number; delay?: number } = {}
): TransitionConfig {
	return {
		duration,
		delay,
		css: (t: number) => {
			const eased = elasticOut(t);
			const glowIntensity = (1 - t) * 0.5;
			
			// Using Canon --color-info-muted color (rgba(80, 130, 185, 0.2))
			return `
				transform: scale(${0.85 + 0.15 * eased});
				opacity: ${t};
				box-shadow: 0 0 ${20 * glowIntensity}px ${4 * glowIntensity}px rgba(80, 130, 185, ${glowIntensity});
			`;
		},
	};
}

/**
 * Fade and shrink - used for deleted elements
 * 
 * Uses Canon --duration-micro (200ms) as default
 */
export function shrink(
	node: Element,
	{ duration = 200, delay = 0 }: { duration?: number; delay?: number } = {}
): TransitionConfig {
	return {
		duration,
		delay,
		css: (t: number) => {
			const eased = cubicOut(t);
			// Using Canon --scale-subtle (0.98)
			return `
				transform: scale(${0.98 + 0.02 * eased});
				opacity: ${eased};
			`;
		},
	};
}

/**
 * Slide transition for panels
 * 
 * Uses Canon --duration-standard (300ms) as default
 */
export function slidePanel(
	node: Element,
	{ duration = 300, direction = 'right' }: { duration?: number; direction?: 'left' | 'right' } = {}
): TransitionConfig {
	const x = direction === 'right' ? 100 : -100;
	
	return {
		duration,
		css: (t: number) => {
			const eased = cubicOut(t);
			return `
				transform: translateX(${x * (1 - eased)}%);
				opacity: ${eased};
			`;
		},
	};
}

/**
 * Highlight flash - used for updated elements
 * 
 * Uses Canon --duration-complex (500ms) as default
 */
export function highlight(
	node: Element,
	{ duration = 500 }: { duration?: number } = {}
): TransitionConfig {
	return {
		duration,
		css: (t: number) => {
			const flash = Math.sin(t * Math.PI);
			// Using Canon --color-info (rgba(80, 130, 185, 1))
			return `
				outline: 2px solid rgba(80, 130, 185, ${flash * 0.8});
				outline-offset: ${2 + 4 * (1 - t)}px;
			`;
		},
	};
}
