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
	/** Optional callback when node enters viewport */
	onInView?: (entry: IntersectionObserverEntry | { immediate: true }) => void;
	/** Optional callback when node exits viewport (when once=false) */
	onOutView?: (entry: IntersectionObserverEntry) => void;
};

export function inview(node: HTMLElement, options: InViewOptions = {}) {
	const {
		threshold = 0.2,
		rootMargin = '0px 0px -80px 0px',
		once = true,
		onInView,
		onOutView
	} = options;

	let triggered = false;

	// Respect reduced motion preference
	if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		const detail = { immediate: true } as const;
		node.dispatchEvent(new CustomEvent('inview', { detail }));
		onInView?.(detail);
		return { destroy() {} };
	}

	let observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && (!once || !triggered)) {
					triggered = true;
					node.dispatchEvent(new CustomEvent('inview', { detail: entry }));
					onInView?.(entry);

					if (once) {
						observer.unobserve(node);
					}
				} else if (!entry.isIntersecting && !once) {
					node.dispatchEvent(new CustomEvent('outview', { detail: entry }));
					onOutView?.(entry);
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
			const {
				threshold: t = 0.2,
				rootMargin: r = '0px 0px -80px 0px',
				onInView: nextOnInView,
				onOutView: nextOnOutView
			} = newOptions;
			observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting && (!once || !triggered)) {
							triggered = true;
							node.dispatchEvent(new CustomEvent('inview', { detail: entry }));
							nextOnInView?.(entry);
							if (once) observer.unobserve(node);
						} else if (!entry.isIntersecting && !once) {
							node.dispatchEvent(new CustomEvent('outview', { detail: entry }));
							nextOnOutView?.(entry);
						}
					});
				},
				{ threshold: t, rootMargin: r }
			);
			observer.observe(node);
		}
	};
}
