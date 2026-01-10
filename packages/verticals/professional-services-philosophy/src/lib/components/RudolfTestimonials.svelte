<script lang="ts">
	/**
	 * RudolfTestimonials - Client outcomes carousel (not testimonials)
	 *
	 * Layout: Horizontal carousel with navigation
	 * Content: Metrics-driven outcomes instead of testimonials
	 */

	import { siteConfig } from '$lib/config/context';

	let currentIndex = $state(0);

	function next() {
		currentIndex = (currentIndex + 1) % $siteConfig.outcomes.length;
	}

	function prev() {
		currentIndex =
			(currentIndex - 1 + $siteConfig.outcomes.length) % $siteConfig.outcomes.length;
	}

	function goTo(index: number) {
		currentIndex = index;
	}
</script>

<section id="testimonials" class="section-outcomes">
	<div class="container">
		<div class="section-header">
			<h2 class="section-heading">Client Outcomes</h2>
			<p class="section-subheading">
				Measurable results. Every metric validated.
			</p>
		</div>

		<div class="outcomes-carousel">
			<div class="carousel-track" style="transform: translateX(-{currentIndex * 100}%)">
				{#each $siteConfig.outcomes as outcome}
					<div class="carousel-slide">
						<div class="outcome-card">
							<div class="outcome-result">{outcome.result}</div>
							<div class="outcome-metric">{outcome.metric}</div>
							<div class="outcome-context">{outcome.context}</div>
							<div class="outcome-year">{outcome.year}</div>
						</div>
					</div>
				{/each}
			</div>

			<div class="carousel-controls">
				<button
					class="carousel-button prev"
					onclick={prev}
					aria-label="Previous outcome"
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="19" y1="12" x2="5" y2="12"></line>
						<polyline points="12 19 5 12 12 5"></polyline>
					</svg>
				</button>
				<button
					class="carousel-button next"
					onclick={next}
					aria-label="Next outcome"
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="5" y1="12" x2="19" y2="12"></line>
						<polyline points="12 5 19 12 12 19"></polyline>
					</svg>
				</button>
			</div>

			<div class="carousel-dots">
				{#each $siteConfig.outcomes as _, index}
					<button
						class="dot"
						class:active={currentIndex === index}
						onclick={() => goTo(index)}
						aria-label={`Go to outcome ${index + 1}`}
					></button>
				{/each}
			</div>
		</div>
	</div>
</section>

<style>
	.section-outcomes {
		padding: var(--section-padding) 0;
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--space-lg);
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-4xl);
	}

	.section-heading {
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
		letter-spacing: -0.02em;
	}

	.section-subheading {
		font-size: var(--text-body-lg);
		line-height: 1.6;
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin: 0 auto;
	}

	.outcomes-carousel {
		position: relative;
		overflow: hidden;
		padding: var(--space-2xl) 0;
	}

	.carousel-track {
		display: flex;
		transition: transform var(--duration-complex) var(--ease-standard);
	}

	.carousel-slide {
		min-width: 100%;
		padding: 0 var(--space-lg);
		box-sizing: border-box;
	}

	.outcome-card {
		max-width: 800px;
		margin: 0 auto;
		text-align: center;
		padding: var(--space-4xl) var(--space-2xl);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.outcome-result {
		font-size: clamp(1.5rem, 3vw, 2.5rem);
		font-weight: 700;
		line-height: 1.3;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.outcome-metric {
		font-size: var(--text-h3);
		font-weight: 600;
		line-height: 1.4;
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	.outcome-context {
		font-size: var(--text-body-lg);
		line-height: 1.6;
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-md);
	}

	.outcome-year {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.carousel-controls {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		pointer-events: none;
		padding: 0 var(--space-lg);
		transform: translateY(-50%);
	}

	.carousel-button {
		pointer-events: auto;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.carousel-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		transform: scale(1.1);
	}

	.carousel-dots {
		display: flex;
		gap: var(--space-sm);
		justify-content: center;
		margin-top: var(--space-2xl);
	}

	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-border-default);
		border: none;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		padding: 0;
	}

	.dot:hover {
		background: var(--color-border-emphasis);
	}

	.dot.active {
		background: var(--color-fg-primary);
	}

	@media (max-width: 768px) {
		.carousel-controls {
			padding: 0 var(--space-md);
		}

		.carousel-button {
			width: 40px;
			height: 40px;
		}
	}
</style>
