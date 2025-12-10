/**
 * Inview Action - Scroll-Triggered Disclosure
 *
 * Implements Intersection Observer for content that reveals as users scroll.
 * This is meaningful disclosure: content hierarchy emerges through navigation.
 *
 * Heideggerian principle: The page unfolds as the user moves through it,
 * revealing structure and relationship progressively.
 *
 * Usage:
 *   <div use:inview on:inview={() => visible = true}>
 *     Content that reveals on scroll
 *   </div>
 */

export interface InViewOptions {
	/** Percentage of element that must be visible (0-1) */
	threshold?: number;
	/** Margin around root element */
	rootMargin?: string;
	/** Only trigger once (default: true) */
	once?: boolean;
}

export function inview(node: HTMLElement, options: InViewOptions = {}) {
	const { threshold = 0.2, rootMargin = '0px', once = true } = options;
	let triggered = false;

	// Respect reduced motion preference
	if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		// Immediately dispatch inview for reduced motion users
		node.dispatchEvent(new CustomEvent('inview', { detail: { immediate: true } }));
		return { destroy() {} };
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && (!once || !triggered)) {
					triggered = true;
					node.dispatchEvent(new CustomEvent('inview', { detail: entry }));
					if (once) observer.unobserve(node);
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
							if (once) newObserver.unobserve(node);
						}
					});
				},
				{ threshold: t, rootMargin: r }
			);
			newObserver.observe(node);
		}
	};
}
