<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// Scroll state
	let scrollProgress = $state(0);
	let pathLength = $state(0);
	let pathElement: SVGPathElement | null = $state(null);

	// Text visibility thresholds
	let visibleTexts = $derived({
		text1: scrollProgress >= 0.2,
		text2: scrollProgress >= 0.32,
		text3: scrollProgress >= 0.48,
		text4: scrollProgress >= 0.62,
		text5: scrollProgress >= 0.78,
		cta: scrollProgress >= 0.92
	});

	// Computed dashoffset (line draws as you scroll)
	let dashOffset = $derived(pathLength * (1 - scrollProgress));

	onMount(() => {
		if (!browser) return;

		// Get path length for dasharray calculation
		if (pathElement) {
			pathLength = pathElement.getTotalLength();
		}

		// Scroll handler with rAF throttling
		let ticking = false;
		function handleScroll() {
			if (!ticking) {
				requestAnimationFrame(() => {
					const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
					scrollProgress = Math.min(1, Math.max(0, window.scrollY / scrollHeight));
					ticking = false;
				});
				ticking = true;
			}
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll(); // Initial call

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	// The path: starts complex (tangled), simplifies to a single clean stroke
	// Designed to feel like complexity resolving into clarity
	const pathD = `
		M 50 0
		C 20 20, 80 40, 50 60
		C 10 80, 90 100, 50 120
		C 30 130, 70 140, 40 150
		C 60 155, 35 165, 55 175
		C 45 180, 55 190, 50 200
		C 48 220, 52 240, 50 260
		L 50 300
	`.trim();
</script>

<div class="revelation-container">
	<!-- Fixed SVG line -->
	<svg
		class="revelation-line"
		viewBox="0 0 100 300"
		preserveAspectRatio="xMidYMid meet"
		aria-hidden="true"
	>
		<path
			bind:this={pathElement}
			d={pathD}
			stroke="var(--color-fg-subtle)"
			stroke-width="0.5"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			style="stroke-dasharray: {pathLength}; stroke-dashoffset: {dashOffset}; will-change: stroke-dashoffset;"
		/>
	</svg>

	<!-- Scroll content container -->
	<div class="scroll-container">
		<!-- Act 1: Recognition -->
		<section class="act act-1">
			<div class="act-content">
				<p class="act-text" class:visible={visibleTexts.text1}>
					You've solved this problem before.
				</p>
				<p class="act-text delayed" class:visible={visibleTexts.text2}>
					You're solving it again.
				</p>
			</div>
		</section>

		<!-- Act 2: The Cut -->
		<section class="act act-2">
			<div class="act-content">
				<p class="act-text" class:visible={visibleTexts.text3}>
					Does it earn its existence?
				</p>
				<p class="act-subtext" class:visible={visibleTexts.text4}>
					If you have to ask, you know.
				</p>
			</div>
		</section>

		<!-- Act 3: The Invitation -->
		<section class="act act-3">
			<div class="act-content">
				<p class="act-text" class:visible={visibleTexts.text5}>
					Let's remove what obscures.
				</p>
				<a href="/services" class="act-cta" class:visible={visibleTexts.cta}>
					See how
					<span class="arrow">→</span>
				</a>
			</div>
		</section>
	</div>
</div>

<style>
	.revelation-container {
		position: relative;
		width: 100%;
	}

	/* Fixed SVG line that draws as you scroll */
	.revelation-line {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		height: 70vh;
		width: auto;
		z-index: 0;
		pointer-events: none;
		opacity: 0.6;
	}

	/* Scrollable content container */
	.scroll-container {
		position: relative;
		z-index: 1;
	}

	/* Each act is a full viewport */
	.act {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2xl);
	}

	.act-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--space-md);
		max-width: 800px;
	}

	/* Typography */
	.act-text {
		font-size: var(--text-display-xl);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: var(--leading-tight);
		letter-spacing: var(--tracking-tight);
		max-width: 14ch;
		opacity: 0;
		transform: translateY(20px);
		transition: opacity var(--duration-complex) var(--ease-standard), transform var(--duration-complex) var(--ease-standard);
	}

	.act-text.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.act-text.delayed {
		transition-delay: var(--duration-micro);
	}

	.act-subtext {
		font-size: var(--text-h2);
		font-weight: var(--font-medium);
		color: var(--color-fg-tertiary);
		font-style: italic;
		max-width: 24ch;
		opacity: 0;
		transform: translateY(20px);
		transition: opacity var(--duration-complex) var(--ease-standard), transform var(--duration-complex) var(--ease-standard);
		transition-delay: var(--duration-micro);
	}

	.act-subtext.visible {
		opacity: 1;
		transform: translateY(0);
	}

	/* CTA */
	.act-cta {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
		padding: var(--space-md) var(--space-xl);
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		background: transparent;
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full);
		opacity: 0;
		transform: translateY(20px);
		transition: opacity var(--duration-complex) var(--ease-standard),
					transform var(--duration-complex) var(--ease-standard),
					border-color var(--duration-micro) var(--ease-standard),
					background var(--duration-micro) var(--ease-standard);
	}

	.act-cta.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.act-cta:hover {
		border-color: var(--color-fg-tertiary);
		background: var(--color-hover);
	}

	.act-cta .arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.act-cta:hover .arrow {
		transform: translateX(4px);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.act-text {
			font-size: var(--text-display);
		}

		.act-subtext {
			font-size: var(--text-h3);
		}

		.revelation-line {
			height: 50vh;
			opacity: 0.4;
		}

		.act {
			padding: var(--space-xl);
		}
	}
</style>
