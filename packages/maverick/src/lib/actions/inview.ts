/**
 * Intersection Observer Action for Scroll-Triggered Animations
 *
 * Replaces React's GSAP ScrollReveal with native browser API.
 * Embodies Zuhandenheit: the animation recedes, content emerges.
 *
 * Usage:
 *   <div use:inview oninview={() => visible = true}>
 */

export type InViewOptions = {
	/** Percentage of element visible before triggering (0-1) */
	threshold?: number;
	/** Root margin for earlier/later trigger */
	rootMargin?: string;
	/** Only trigger once (default: true) */
	once?: boolean;
};

export function inview(node: HTMLElement, options: InViewOptions = {}) {
	const { threshold = 0.2, rootMargin = '0px 0px -80px 0px', once = true } = options;

	let triggered = false;

	// Respect reduced motion preference
	if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		node.dispatchEvent(new CustomEvent('inview', { detail: { immediate: true } }));
		return { destroy() {} };
	}

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
			observer.disconnect();
			const { threshold: t = 0.2, rootMargin: r = '0px 0px -80px 0px' } = newOptions;
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
