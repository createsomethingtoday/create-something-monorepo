<script lang="ts">
	/**
	 * MetricCounters Component
	 *
	 * Animated statistics that count up on scroll.
	 * Numbers build trust. Animation draws attention purposefully.
	 *
	 * Canon principle: Motion serves disclosure, not decoration.
	 *
	 * @example
	 * <MetricCounters
	 *   metrics={[
	 *     { value: 500, suffix: '+', label: 'Projects' },
	 *     { value: 98, suffix: '%', label: 'Satisfaction' },
	 *     { value: 15, label: 'Years Experience' }
	 *   ]}
	 * />
	 */

	import { onMount } from 'svelte';

	interface Metric {
		value: number;
		label: string;
		prefix?: string;
		suffix?: string;
	}

	interface Props {
		metrics?: Metric[];
		animationDuration?: number;
	}

	const defaultMetrics: Metric[] = [
		{ value: 500, suffix: '+', label: 'Projects Completed' },
		{ value: 98, suffix: '%', label: 'Client Satisfaction' },
		{ value: 15, label: 'Years Experience' },
		{ value: 50, suffix: '+', label: 'Team Members' }
	];

	let {
		metrics = defaultMetrics,
		animationDuration = 2000
	}: Props = $props();

	let hasAnimated = $state(false);
	let sectionRef: HTMLElement | undefined = $state();
	let displayValues = $state<number[]>(metrics.map(() => 0));

	// Easing function for smooth animation
	function easeOutExpo(t: number): number {
		return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
	}

	function animateCounter(index: number, targetValue: number) {
		const startTime = performance.now();

		function update(currentTime: number) {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / animationDuration, 1);
			const easedProgress = easeOutExpo(progress);

			displayValues[index] = Math.floor(targetValue * easedProgress);

			if (progress < 1) {
				requestAnimationFrame(update);
			}
		}

		requestAnimationFrame(update);
	}

	function startAnimations() {
		if (hasAnimated) return;
		hasAnimated = true;

		metrics.forEach((metric, index) => {
			setTimeout(() => {
				animateCounter(index, metric.value);
			}, index * 150); // Stagger by 150ms
		});
	}

	onMount(() => {
		if (!sectionRef) return;

		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (prefersReducedMotion) {
			// Show final values immediately
			displayValues = metrics.map((m) => m.value);
			hasAnimated = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !hasAnimated) {
						startAnimations();
					}
				});
			},
			{
				threshold: 0.3,
				rootMargin: '0px 0px -50px 0px'
			}
		);

		observer.observe(sectionRef);

		return () => observer.disconnect();
	});

	function formatNumber(value: number): string {
		return value.toLocaleString();
	}
</script>

<section class="metrics-section" bind:this={sectionRef}>
	<div class="container">
		<div class="metrics-grid">
			{#each metrics as metric, index}
				<div class="metric-item" class:animated={hasAnimated}>
					<div class="metric-value">
						{#if metric.prefix}<span class="metric-prefix">{metric.prefix}</span>{/if}
						<span class="metric-number">{formatNumber(displayValues[index])}</span>
						{#if metric.suffix}<span class="metric-suffix">{metric.suffix}</span>{/if}
					</div>
					<div class="metric-label">{metric.label}</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.metrics-section {
		padding: var(--space-2xl, 6.854rem) var(--space-lg, 2.618rem);
		background: var(--color-bg-elevated, #0a0a0a);
		position: relative;
		overflow: hidden;
	}

	/* Subtle background pattern */
	.metrics-section::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.03) 0%, transparent 50%),
			radial-gradient(circle at 80% 50%, rgba(255, 255, 255, 0.02) 0%, transparent 50%);
		pointer-events: none;
	}

	.container {
		max-width: 72rem;
		margin: 0 auto;
		position: relative;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-lg, 2.618rem);
	}

	.metric-item {
		text-align: center;
		padding: var(--space-lg, 2.618rem);
		position: relative;
	}

	/* Divider between metrics (except last) */
	.metric-item:not(:last-child)::after {
		content: '';
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		height: 60%;
		width: 1px;
		background: var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.metric-value {
		font-size: var(--text-display, clamp(2.5rem, 4vw + 1.5rem, 5rem));
		font-weight: 700;
		color: var(--color-fg-primary, #fff);
		line-height: 1;
		margin-bottom: var(--space-sm, 1rem);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.1em;
	}

	.metric-prefix {
		font-weight: 500;
		opacity: 0.9;
	}

	.metric-suffix {
		font-weight: 500;
		opacity: 0.9;
		font-size: 0.6em;
	}

	.metric-label {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 500;
	}

	/* Animation entrance */
	.metric-item {
		opacity: 0;
		transform: translateY(20px);
		transition:
			opacity var(--duration-complex, 500ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			transform var(--duration-complex, 500ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.metric-item.animated {
		opacity: 1;
		transform: translateY(0);
	}

	.metric-item:nth-child(1) { transition-delay: 0ms; }
	.metric-item:nth-child(2) { transition-delay: 100ms; }
	.metric-item:nth-child(3) { transition-delay: 200ms; }
	.metric-item:nth-child(4) { transition-delay: 300ms; }

	/* Responsive */
	@media (max-width: 1024px) {
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.metric-item:nth-child(2)::after {
			display: none;
		}

		.metric-item:nth-child(1)::after,
		.metric-item:nth-child(3)::after {
			display: block;
		}
	}

	@media (max-width: 640px) {
		.metrics-section {
			padding: var(--space-xl, 4.236rem) var(--space-md, 1.618rem);
		}

		.metrics-grid {
			grid-template-columns: 1fr;
			gap: var(--space-md, 1.618rem);
		}

		.metric-item::after {
			display: none !important;
		}

		.metric-item {
			border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
			padding-bottom: var(--space-md, 1.618rem);
		}

		.metric-item:last-child {
			border-bottom: none;
			padding-bottom: 0;
		}

		.metric-value {
			font-size: var(--text-h1, clamp(2rem, 3vw + 1rem, 3.5rem));
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.metric-item {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
