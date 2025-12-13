<script lang="ts">
	/**
	 * TestimonialsSection - Client Testimonials Carousel
	 *
	 * Premium feature: Auto-rotating testimonials with manual navigation.
	 * Philosophy: Social proof builds trust for legal services.
	 * Canon: Let the voices speak. Minimal chrome.
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { onMount, onDestroy } from 'svelte';
	import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();
	const { testimonials } = siteConfig;

	let currentIndex = $state(0);
	let isAutoPlaying = $state(true);
	let autoPlayInterval: ReturnType<typeof setInterval> | null = null;

	function next() {
		currentIndex = (currentIndex + 1) % testimonials.length;
	}

	function prev() {
		currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
	}

	function goTo(index: number) {
		currentIndex = index;
	}

	function pauseAutoPlay() {
		isAutoPlaying = false;
		if (autoPlayInterval) {
			clearInterval(autoPlayInterval);
			autoPlayInterval = null;
		}
	}

	function resumeAutoPlay() {
		isAutoPlaying = true;
		startAutoPlay();
	}

	function startAutoPlay() {
		if (autoPlayInterval) clearInterval(autoPlayInterval);
		autoPlayInterval = setInterval(() => {
			if (isAutoPlaying) {
				next();
			}
		}, 6000); // Change every 6 seconds
	}

	onMount(() => {
		startAutoPlay();
	});

	onDestroy(() => {
		if (autoPlayInterval) {
			clearInterval(autoPlayInterval);
		}
	});
</script>

<section class="testimonials-section">
	<div class="testimonials-container">
		<div class="section-header">
			<h2 class="section-title">What Our Clients Say</h2>
			<p class="section-subtitle">Real experiences from clients we have helped</p>
		</div>

		<div
			class="testimonials-carousel"
			onmouseenter={pauseAutoPlay}
			onmouseleave={resumeAutoPlay}
			role="region"
			aria-label="Client testimonials"
		>
			<!-- Quote Icon -->
			<div class="quote-icon" aria-hidden="true">
				<Quote size={48} strokeWidth={1} />
			</div>

			<!-- Testimonials Container -->
			<div class="testimonials-track">
				{#each testimonials as testimonial, index}
					<div
						class="testimonial-slide"
						class:active={index === currentIndex}
						aria-hidden={index !== currentIndex}
					>
						<blockquote class="testimonial-quote">
							"{testimonial.quote}"
						</blockquote>

						{#if testimonial.rating}
							<div class="testimonial-rating" aria-label={`${testimonial.rating} out of 5 stars`}>
								{#each Array(5) as _, i}
									<Star
										size={18}
										fill={i < testimonial.rating ? 'currentColor' : 'none'}
										strokeWidth={1.5}
									/>
								{/each}
							</div>
						{/if}

						<div class="testimonial-author">
							<span class="author-name">{testimonial.author}</span>
							{#if testimonial.title}
								<span class="author-title">{testimonial.title}</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Navigation Arrows -->
			<button
				class="nav-button nav-prev"
				onclick={prev}
				aria-label="Previous testimonial"
			>
				<ChevronLeft size={24} strokeWidth={1.5} />
			</button>
			<button
				class="nav-button nav-next"
				onclick={next}
				aria-label="Next testimonial"
			>
				<ChevronRight size={24} strokeWidth={1.5} />
			</button>

			<!-- Dot Indicators -->
			<div class="dot-indicators" role="tablist" aria-label="Testimonial navigation">
				{#each testimonials as _, index}
					<button
						class="dot"
						class:active={index === currentIndex}
						onclick={() => goTo(index)}
						role="tab"
						aria-selected={index === currentIndex}
						aria-label={`Go to testimonial ${index + 1}`}
					></button>
				{/each}
			</div>
		</div>
	</div>
</section>

<style>
	.testimonials-section {
		padding: var(--space-3xl) var(--space-lg);
		background: var(--color-bg-pure);
		position: relative;
	}

	.testimonials-container {
		max-width: 900px;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.testimonials-carousel {
		position: relative;
		padding: var(--space-xl) var(--space-2xl);
	}

	.quote-icon {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		color: var(--color-fg-subtle);
		opacity: 0.5;
	}

	.testimonials-track {
		position: relative;
		min-height: 280px;
	}

	.testimonial-slide {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		opacity: 0;
		transform: translateX(20px);
		transition: opacity var(--duration-complex) var(--ease-standard),
			transform var(--duration-complex) var(--ease-standard);
		pointer-events: none;
	}

	.testimonial-slide.active {
		opacity: 1;
		transform: translateX(0);
		pointer-events: auto;
	}

	.testimonial-quote {
		font-size: var(--text-h3);
		font-weight: var(--font-regular);
		color: var(--color-fg-primary);
		line-height: var(--leading-relaxed);
		margin: 0 0 var(--space-lg);
		font-style: italic;
		max-width: 700px;
	}

	.testimonial-rating {
		display: flex;
		gap: 4px;
		color: var(--color-data-4);
		margin-bottom: var(--space-md);
	}

	.testimonial-author {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.author-name {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.author-title {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Navigation Buttons */
	.nav-button {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-button:hover {
		background: var(--color-bg-subtle);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.nav-prev {
		left: 0;
	}

	.nav-next {
		right: 0;
	}

	/* Dot Indicators */
	.dot-indicators {
		display: flex;
		justify-content: center;
		gap: var(--space-xs);
		margin-top: var(--space-lg);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: var(--radius-full);
		background: var(--color-fg-subtle);
		border: none;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.dot.active {
		background: var(--color-fg-primary);
		transform: scale(1.2);
	}

	.dot:hover:not(.active) {
		background: var(--color-fg-muted);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.testimonials-section {
			padding: var(--space-2xl) var(--space-md);
		}

		.testimonials-carousel {
			padding: var(--space-lg) var(--space-md);
		}

		.testimonial-quote {
			font-size: var(--text-body-lg);
		}

		.nav-button {
			display: none; /* Use swipe on mobile instead */
		}

		.testimonials-track {
			min-height: 320px;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.testimonial-slide {
			transition: opacity var(--duration-micro) linear;
			transform: none;
		}

		.testimonial-slide.active {
			transform: none;
		}
	}
</style>
