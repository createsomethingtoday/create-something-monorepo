/**
 * InView Action - Scroll-triggered visibility detection
 *
 * Adds 'is-visible' class when element enters viewport.
 * Dispatches 'inview' custom event for programmatic handling.
 * Used for reveal animations.
 */

export interface InViewOptions {
	threshold?: number;
	rootMargin?: string;
	once?: boolean;
}

export function inview(node: HTMLElement, options: InViewOptions = {}) {
	const { threshold = 0.1, rootMargin = '0px', once = true } = options;

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					node.classList.add('is-visible');
					node.dispatchEvent(new CustomEvent('inview', { detail: { inView: true } }));
					if (once) {
						observer.unobserve(node);
					}
				} else if (!once) {
					node.classList.remove('is-visible');
					node.dispatchEvent(new CustomEvent('inview', { detail: { inView: false } }));
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
			// Re-observe with new options if needed
			observer.disconnect();
			const newObserver = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							node.classList.add('is-visible');
							node.dispatchEvent(new CustomEvent('inview', { detail: { inView: true } }));
							if (newOptions.once !== false) {
								newObserver.unobserve(node);
							}
						} else if (newOptions.once === false) {
							node.classList.remove('is-visible');
							node.dispatchEvent(new CustomEvent('inview', { detail: { inView: false } }));
						}
					});
				},
				{
					threshold: newOptions.threshold ?? threshold,
					rootMargin: newOptions.rootMargin ?? rootMargin
				}
			);
			newObserver.observe(node);
		}
	};
}
