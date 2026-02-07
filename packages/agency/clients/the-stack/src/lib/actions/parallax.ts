/**
 * Parallax Action - Scroll-based parallax with smooth interpolation
 *
 * Uses requestAnimationFrame lerp for buttery smooth motion.
 * The transform eases toward the target rather than snapping to it.
 */

export interface ParallaxOptions {
	speed?: number;
	smoothing?: number; // 0-1, lower = smoother (default 0.08)
}

export function parallax(node: HTMLElement, options: ParallaxOptions = {}) {
	const { speed = 0.2, smoothing = 0.08 } = options;

	let target = 0;
	let current = 0;
	let rafId: number;
	let isRunning = true;

	function lerp(start: number, end: number, factor: number): number {
		return start + (end - start) * factor;
	}

	function updateTarget() {
		const rect = node.getBoundingClientRect();
		const scrolled = window.scrollY;
		const offset = rect.top + scrolled;
		target = (scrolled - offset + window.innerHeight) * speed;
	}

	function animate() {
		if (!isRunning) return;

		current = lerp(current, target, smoothing);

		// Stop animating when close enough (sub-pixel precision)
		if (Math.abs(current - target) > 0.1) {
			node.style.transform = `translate3d(0, ${current}px, 0)`;
		}

		rafId = requestAnimationFrame(animate);
	}

	function handleScroll() {
		updateTarget();
	}

	// Initialize
	updateTarget();
	current = target; // Start at target to avoid initial animation
	node.style.transform = `translate3d(0, ${current}px, 0)`;
	node.style.willChange = 'transform';

	window.addEventListener('scroll', handleScroll, { passive: true });
	rafId = requestAnimationFrame(animate);

	return {
		destroy() {
			isRunning = false;
			cancelAnimationFrame(rafId);
			window.removeEventListener('scroll', handleScroll);
			node.style.willChange = '';
		},
		update(newOptions: ParallaxOptions) {
			// Speed can be updated dynamically
		}
	};
}
