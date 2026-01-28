/**
 * Animation & Transition Standards
 *
 * Rams: "Good design is unobtrusive"
 * Animations must be perceptible but not distracting (≤500ms)
 *
 * @remarks
 * All exports in this module are part of the public design system API.
 * They are intentionally exposed for external consumption even if not
 * used internally within this monorepo.
 *
 * @see /STANDARDS.md - Section 2.1 Animation & Transitions
 * @packageDocumentation
 */

export const animation = {
	ease: {
		standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)' // Material Design curve
	},
	duration: {
		micro: '200ms', // Micro-interactions (hover, focus)
		standard: '300ms', // Standard transitions (color, opacity)
		complex: '500ms' // Complex transitions (layout, slide)
	}
} as const;

export type EaseKey = keyof typeof animation.ease;
export type DurationKey = keyof typeof animation.duration;

/**
 * Get easing function
 */
export function getEase(key: EaseKey = 'standard'): string {
	return animation.ease[key];
}

/**
 * Get duration value
 */
export function getDuration(key: DurationKey): string {
	return animation.duration[key];
}

/**
 * CSS custom property names for animation
 */
export const animationVars = {
	ease: '--ease-standard',
	durationMicro: '--duration-micro',
	durationStandard: '--duration-standard',
	durationComplex: '--duration-complex'
} as const;

/**
 * Generate CSS custom properties string
 */
export function generateAnimationCSS(): string {
	return `  ${animationVars.ease}: ${animation.ease.standard};
  ${animationVars.durationMicro}: ${animation.duration.micro};
  ${animationVars.durationStandard}: ${animation.duration.standard};
  ${animationVars.durationComplex}: ${animation.duration.complex};`;
}

/**
 * Common transition presets
 */
export const transitions = {
	// Opacity-based (micro)
	opacity: `opacity ${animation.duration.micro} ${animation.ease.standard}`,

	// Color-based (standard)
	colors: `color ${animation.duration.standard} ${animation.ease.standard}`,
	background: `background-color ${animation.duration.standard} ${animation.ease.standard}`,
	border: `border-color ${animation.duration.standard} ${animation.ease.standard}`,

	// Transform-based (standard)
	transform: `transform ${animation.duration.standard} ${animation.ease.standard}`,

	// Layout-based (complex)
	all: `all ${animation.duration.standard} ${animation.ease.standard}`,

	// Slide animations (complex)
	slide: `transform ${animation.duration.complex} ${animation.ease.standard}`
} as const;

export type TransitionKey = keyof typeof transitions;

/**
 * Get transition preset
 */
export function getTransition(key: TransitionKey): string {
	return transitions[key];
}
