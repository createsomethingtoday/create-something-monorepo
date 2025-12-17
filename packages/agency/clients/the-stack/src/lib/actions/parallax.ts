/**
 * Parallax Action - Scroll-based parallax effect
 *
 * Moves element vertically based on scroll position.
 */

export interface ParallaxOptions {
	speed?: number;
}

export function parallax(node: HTMLElement, options: ParallaxOptions = {}) {
	const { speed = 0.2 } = options;

	function handleScroll() {
		const rect = node.getBoundingClientRect();
		const scrolled = window.scrollY;
		const offset = rect.top + scrolled;
		const parallaxAmount = (scrolled - offset + window.innerHeight) * speed;
		node.style.transform = `translateY(${parallaxAmount}px)`;
	}

	// Initial position
	handleScroll();

	window.addEventListener('scroll', handleScroll, { passive: true });

	return {
		destroy() {
			window.removeEventListener('scroll', handleScroll);
		},
		update(newOptions: ParallaxOptions) {
			// Speed can be updated dynamically
		}
	};
}
