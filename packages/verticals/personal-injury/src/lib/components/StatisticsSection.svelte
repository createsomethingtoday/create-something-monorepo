<script lang="ts">
	/**
	 * StatisticsSection - Animated Counter Statistics
	 *
	 * Premium feature: Numbers that count up on scroll.
	 * Philosophy: Numbers build trust. Animation draws attention.
	 * Canon: Motion serves disclosure, not decoration.
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { onMount } from 'svelte';

	const siteConfig = getSiteConfigFromContext();
	const { statistics } = siteConfig;

	// Track animation state
	let hasAnimated = $state(false);
	let sectionRef: HTMLElement | undefined = $state();
	let displayValues = $state<number[]>(statistics.map(() => 0));

	// Easing function for smooth animation
	function easeOutExpo(t: number): number {
		return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
	}

	// Animate a single counter
	function animateCounter(index: number, targetValue: number, duration: number = 2000) {
		const startTime = performance.now();
		const startValue = 0;

		function update(currentTime: number) {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = easeOutExpo(progress);

			displayValues[index] = Math.floor(startValue + (targetValue - startValue) * easedProgress);

			if (progress < 1) {
				requestAnimationFrame(update);
			}
		}

		requestAnimationFrame(update);
	}

	// Start all animations with staggered delay
	function startAnimations() {
		if (hasAnimated) return;
		hasAnimated = true;

		statistics.forEach((stat, index) => {
			setTimeout(() => {
				animateCounter(index, stat.value, 2000);
			}, index * 150); // Stagger by 150ms
		});
	}

	onMount(() => {
		if (!sectionRef) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !hasAnimated) {
						startAnimations();
					}
				});
			},
			{
				threshold: 0.3, // Trigger when 30% visible
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

<section class="statistics-section" bind:this={sectionRef}>
	<div class="statistics-container">
		<div class="statistics-grid">
			{#each statistics as stat, index}
				<div class="stat-item" class:animated={hasAnimated}>
					<div class="stat-value">
						{#if stat.prefix}<span class="stat-prefix">{stat.prefix}</span>{/if}
						<span class="stat-number">{formatNumber(displayValues[index])}</span>
						{#if stat.suffix}<span class="stat-suffix">{stat.suffix}</span>{/if}
					</div>
					<div class="stat-label">{stat.label}</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.statistics-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-elevated);
		position: relative;
		overflow: hidden;
	}

	/* Subtle background pattern */
	.statistics-section::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.03) 0%, transparent 50%),
			radial-gradient(circle at 80% 50%, rgba(255, 255, 255, 0.02) 0%, transparent 50%);
		pointer-events: none;
	}

	.statistics-container {
		max-width: var(--container-xl);
		margin: 0 auto;
		position: relative;
	}

	.statistics-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-lg);
	}

	.stat-item {
		text-align: center;
		padding: var(--space-lg);
		position: relative;
	}

	/* Divider between stats (except last) */
	.stat-item:not(:last-child)::after {
		content: '';
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		height: 60%;
		width: 1px;
		background: var(--color-border-default);
	}

	.stat-value {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: 1;
		margin-bottom: var(--space-sm);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.1em;
	}

	.stat-prefix {
		font-weight: var(--font-medium);
		opacity: 0.9;
	}

	.stat-suffix {
		font-weight: var(--font-medium);
		opacity: 0.9;
		font-size: 0.6em;
	}

	.stat-label {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		font-weight: var(--font-medium);
	}

	/* Animation entrance */
	.stat-item {
		opacity: 0;
		transform: translateY(20px);
		transition: opacity var(--duration-complex) var(--ease-decelerate),
			transform var(--duration-complex) var(--ease-decelerate);
	}

	.stat-item.animated {
		opacity: 1;
		transform: translateY(0);
	}

	.stat-item:nth-child(1) { transition-delay: 0ms; }
	.stat-item:nth-child(2) { transition-delay: 100ms; }
	.stat-item:nth-child(3) { transition-delay: 200ms; }
	.stat-item:nth-child(4) { transition-delay: 300ms; }

	/* Responsive */
	@media (max-width: 1024px) {
		.statistics-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-item:nth-child(2)::after {
			display: none;
		}

		.stat-item:nth-child(1)::after,
		.stat-item:nth-child(3)::after {
			display: block;
		}
	}

	@media (max-width: 640px) {
		.statistics-section {
			padding: var(--space-xl) var(--space-md);
		}

		.statistics-grid {
			grid-template-columns: 1fr;
			gap: var(--space-md);
		}

		.stat-item::after {
			display: none !important;
		}

		.stat-item {
			border-bottom: 1px solid var(--color-border-default);
			padding-bottom: var(--space-md);
		}

		.stat-item:last-child {
			border-bottom: none;
			padding-bottom: 0;
		}

		.stat-value {
			font-size: var(--text-h1);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.stat-item {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
