/**
 * View Transitions API integration for SvelteKit
 *
 * Enables smooth page transitions that embody the hermeneutic circle—
 * navigation feels like dwelling, not jumping.
 *
 * @see https://svelte.dev/blog/view-transitions
 */
import { onNavigate } from '$app/navigation';

export type Mode = 'ltd' | 'io' | 'space' | 'agency';

/**
 * Mode-specific transition durations reflecting each property's character
 */
const MODE_DURATIONS: Record<Mode, number> = {
	ltd: 500, // Contemplative
	io: 300, // Analytical
	space: 300, // Experimental
	agency: 200 // Efficient
};

/**
 * Sets up View Transitions API for within-property navigation.
 *
 * Call this once in your root +layout.svelte:
 * ```svelte
 * <script>
 *   import { setupViewTransitions } from '@create-something/canon/transitions';
 *   setupViewTransitions('io');
 * </script>
 * ```
 *
 * @param mode - The current property/Mode of Being
 */
export function setupViewTransitions(mode: Mode = 'io'): void {
	onNavigate((navigation) => {
		// Progressive enhancement: skip if API not available
		if (!document.startViewTransition) return;

		// Respect reduced motion preference
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) return;

		// Set mode-specific duration via CSS custom property
		document.documentElement.style.setProperty(
			'--view-transition-duration',
			`${MODE_DURATIONS[mode]}ms`
		);

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
}

/**
 * Store the origin property when navigating cross-domain.
 * Called before navigating to a different CREATE Something property.
 */
export function setTransitionOrigin(from: Mode, to: Mode): void {
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.setItem('cs-transition-from', from);
		sessionStorage.setItem('cs-transition-to', to);
		sessionStorage.setItem('cs-transition-time', Date.now().toString());
	}
}

/**
 * Get and clear the transition origin on page load.
 * Returns null if no recent cross-property transition occurred.
 */
export function getTransitionOrigin(): { from: Mode; to: Mode } | null {
	if (typeof sessionStorage === 'undefined') return null;

	const from = sessionStorage.getItem('cs-transition-from') as Mode | null;
	const to = sessionStorage.getItem('cs-transition-to') as Mode | null;
	const time = sessionStorage.getItem('cs-transition-time');

	// Clear stored values
	sessionStorage.removeItem('cs-transition-from');
	sessionStorage.removeItem('cs-transition-to');
	sessionStorage.removeItem('cs-transition-time');

	// Only valid if transition was recent (within 5 seconds)
	if (from && to && time) {
		const elapsed = Date.now() - parseInt(time, 10);
		if (elapsed < 5000) {
			return { from, to };
		}
	}

	return null;
}

/**
 * Extract the Mode from a CREATE Something URL.
 */
export function extractModeFromUrl(url: string): Mode | null {
	if (url.includes('createsomething.ltd')) return 'ltd';
	if (url.includes('createsomething.io')) return 'io';
	if (url.includes('createsomething.space')) return 'space';
	if (url.includes('createsomething.agency')) return 'agency';
	return null;
}

/**
 * Check if a URL is a cross-property CREATE Something link.
 */
export function isCrossPropertyLink(url: string, currentMode: Mode): boolean {
	const targetMode = extractModeFromUrl(url);
	return targetMode !== null && targetMode !== currentMode;
}
