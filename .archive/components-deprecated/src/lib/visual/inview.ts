/**
 * Intersection Observer Action for Scroll-Triggered Animations
 *
 * Svelte action that triggers animations when elements scroll into view.
 * Embodies "the tool recedes" - animation feels natural, not forced.
 *
 * Usage:
 *   <div use:inview={{ threshold: 0.3 }} on:inview={handleInView}>
 *
 * Or with the helper:
 *   <div use:inview on:inview={() => visible = true}>
 */

export type InViewOptions = {
	/** Percentage of element visible before triggering (0-1) */
	threshold?: number;
	/** Root margin for earlier/later trigger */
	rootMargin?: string;
	/** Only trigger once (default: true) */
	once?: boolean;
};

/**
 * Svelte action for intersection observer
 */
export function inview(node: HTMLElement, options: InViewOptions = {}) {
	const { threshold = 0.2, rootMargin = '0px', once = true } = options;

	let triggered = false;

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && (!once || !triggered)) {
					triggered = true;
					node.dispatchEvent(new CustomEvent('inview', { detail: entry }));

					if (once) {
						observer.unobserve(node);
					}
				} else if (!entry.isIntersecting && !once) {
					node.dispatchEvent(new CustomEvent('outview', { detail: entry }));
				}
			});
		},
		{ threshold, rootMargin }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		},
		update(newOptions: InViewOptions) {
			// Reconnect with new options if needed
			observer.disconnect();
			const { threshold: t = 0.2, rootMargin: r = '0px' } = newOptions;
			const newObserver = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting && (!once || !triggered)) {
							triggered = true;
							node.dispatchEvent(new CustomEvent('inview', { detail: entry }));
						}
					});
				},
				{ threshold: t, rootMargin: r }
			);
			newObserver.observe(node);
		}
	};
}

/**
 * Helper to create a reactive visible state
 */
export function createInViewState() {
	let visible = $state(false);

	return {
		get visible() {
			return visible;
		},
		onInView() {
			visible = true;
		},
		reset() {
			visible = false;
		}
	};
}
