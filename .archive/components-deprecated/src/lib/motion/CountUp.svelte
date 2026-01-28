<script lang="ts">
	/**
	 * CountUp - Animated number counter
	 *
	 * Counts from a starting value to a target when visible.
	 * Uses requestAnimationFrame for smooth animation.
	 *
	 * @example
	 * <CountUp to={1500} prefix="$" suffix="+" separator />
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		/** Target number to count to */
		to: number;
		/** Starting number */
		from?: number;
		/** Animation duration in milliseconds */
		duration?: number;
		/** Number of decimal places */
		decimals?: number;
		/** Prefix string (e.g., "$") */
		prefix?: string;
		/** Suffix string (e.g., "+", "%") */
		suffix?: string;
		/** Add thousands separator */
		separator?: boolean;
		/** Delay before animation starts */
		delay?: number;
		/** Visibility threshold (0-1) */
		threshold?: number;
		/** Additional classes */
		class?: string;
	}

	let {
		to,
		from = 0,
		duration = 1200,
		decimals = 0,
		prefix = '',
		suffix = '',
		separator = false,
		delay = 0,
		threshold = 0.4,
		class: className = ''
	}: Props = $props();

	let element: HTMLSpanElement;
	let displayValue = $state(from);
	let hasAnimated = $state(false);

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	// Format number with separator and decimals
	const formatNumber = (value: number): string => {
		let formatted = value.toFixed(decimals);

		if (separator) {
			const parts = formatted.split('.');
			parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
			formatted = parts.join('.');
		}

		return `${prefix}${formatted}${suffix}`;
	};

	// Easing function (ease-out)
	const easeOutQuart = (t: number): number => {
		return 1 - Math.pow(1 - t, 4);
	};

	// Animation function
	const animate = () => {
		if (hasAnimated) return;
		hasAnimated = true;

		// If reduced motion, show final value immediately
		if (prefersReducedMotion) {
			displayValue = to;
			return;
		}

		const startTime = performance.now();
		const startValue = from;
		const endValue = to;

		const tick = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = easeOutQuart(progress);

			displayValue = startValue + (endValue - startValue) * easedProgress;

			if (progress < 1) {
				requestAnimationFrame(tick);
			} else {
				displayValue = endValue;
			}
		};

		requestAnimationFrame(tick);
	};

	onMount(() => {
		if (!browser || !element) return;

		// If reduced motion, show immediately
		if (prefersReducedMotion) {
			displayValue = to;
			hasAnimated = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !hasAnimated) {
						if (delay > 0) {
							setTimeout(animate, delay);
						} else {
							animate();
						}
						observer.unobserve(element);
					}
				});
			},
			{ threshold }
		);

		observer.observe(element);

		return () => observer.disconnect();
	});
</script>

<span bind:this={element} class="count-up {className}">
	{formatNumber(displayValue)}
</span>

<style>
	.count-up {
		/* Inherit font styles from parent */
		font-variant-numeric: tabular-nums;
	}
</style>
