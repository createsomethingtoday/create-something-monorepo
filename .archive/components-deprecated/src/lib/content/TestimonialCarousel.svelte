<script lang="ts">
	/**
	 * TestimonialCarousel Component
	 *
	 * Auto-rotating testimonial carousel with quote styling.
	 * Features star ratings, author info, and navigation.
	 *
	 * Canon principle: Social proof should build trust, not overwhelm.
	 *
	 * @example
	 * <TestimonialCarousel
	 *   testimonials={[
	 *     {
	 *       quote: "Excellent service...",
	 *       author: "John Doe",
	 *       role: "CEO, Company",
	 *       rating: 5
	 *     }
	 *   ]}
	 *   autoPlay={true}
	 * />
	 */

	import { onMount } from 'svelte';

	interface Testimonial {
		quote: string;
		author: string;
		role?: string;
		avatar?: string;
		rating?: number;
	}

	interface Props {
		/** Array of testimonials */
		testimonials: Testimonial[];
		/** Section headline */
		headline?: string;
		/** Section subheadline */
		subheadline?: string;
		/** Enable auto-play */
		autoPlay?: boolean;
		/** Auto-play interval in ms */
		autoPlayInterval?: number;
		/** Pause on hover */
		pauseOnHover?: boolean;
		/** Show star ratings */
		showRatings?: boolean;
		/** Show navigation arrows */
		showArrows?: boolean;
		/** Show dot indicators */
		showDots?: boolean;
		/** Show quote icon */
		showQuoteIcon?: boolean;
	}

	let {
		testimonials,
		headline,
		subheadline,
		autoPlay = true,
		autoPlayInterval = 6000,
		pauseOnHover = true,
		showRatings = true,
		showArrows = true,
		showDots = true,
		showQuoteIcon = true
	}: Props = $props();

	let currentIndex = $state(0);
	let isPaused = $state(false);
	let autoPlayTimer: ReturnType<typeof setInterval> | null = null;

	const totalSlides = $derived(testimonials.length);

	function goToSlide(index: number) {
		currentIndex = ((index % totalSlides) + totalSlides) % totalSlides;
	}

	function nextSlide() {
		goToSlide(currentIndex + 1);
	}

	function prevSlide() {
		goToSlide(currentIndex - 1);
	}

	function startAutoPlay() {
		if (autoPlay && !autoPlayTimer) {
			autoPlayTimer = setInterval(() => {
				if (!isPaused) {
					nextSlide();
				}
			}, autoPlayInterval);
		}
	}

	function stopAutoPlay() {
		if (autoPlayTimer) {
			clearInterval(autoPlayTimer);
			autoPlayTimer = null;
		}
	}

	function handleMouseEnter() {
		if (pauseOnHover) {
			isPaused = true;
		}
	}

	function handleMouseLeave() {
		if (pauseOnHover) {
			isPaused = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			prevSlide();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			nextSlide();
		}
	}

	$effect(() => {
		if (autoPlay) {
			startAutoPlay();
		} else {
			stopAutoPlay();
		}

		return () => stopAutoPlay();
	});

	onMount(() => {
		return () => stopAutoPlay();
	});
</script>

<section
	class="testimonials"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onkeydown={handleKeydown}
	role="region"
	aria-roledescription="carousel"
	aria-label="Testimonials"
	tabindex="0"
>
	{#if headline || subheadline}
		<header class="testimonials-header">
			{#if headline}
				<h2 class="headline">{headline}</h2>
			{/if}
			{#if subheadline}
				<p class="subheadline">{subheadline}</p>
			{/if}
		</header>
	{/if}

	<div class="testimonials-container">
		<!-- Navigation Arrows -->
		{#if showArrows && totalSlides > 1}
			<button class="nav-arrow nav-prev" onclick={prevSlide} aria-label="Previous testimonial">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M15 18l-6-6 6-6" />
				</svg>
			</button>
		{/if}

		<!-- Testimonial Card -->
		<div class="testimonial-viewport">
			{#each testimonials as testimonial, index}
				<div
					class="testimonial-card"
					class:active={index === currentIndex}
					role="group"
					aria-roledescription="slide"
					aria-label="Testimonial {index + 1} of {totalSlides}"
					aria-hidden={index !== currentIndex}
				>
					{#if showQuoteIcon}
						<div class="quote-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"
								/>
							</svg>
						</div>
					{/if}

					{#if showRatings && testimonial.rating}
						<div class="rating" aria-label="{testimonial.rating} out of 5 stars">
							{#each Array(5) as _, i}
								<svg
									class="star"
									class:filled={i < testimonial.rating}
									viewBox="0 0 24 24"
									fill="currentColor"
								>
									<path
										d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
									/>
								</svg>
							{/each}
						</div>
					{/if}

					<blockquote class="quote">
						<p>"{testimonial.quote}"</p>
					</blockquote>

					<div class="author">
						{#if testimonial.avatar}
							<img src={testimonial.avatar} alt={testimonial.author} class="avatar" />
						{/if}
						<div class="author-info">
							<cite class="author-name">{testimonial.author}</cite>
							{#if testimonial.role}
								<span class="author-role">{testimonial.role}</span>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		{#if showArrows && totalSlides > 1}
			<button class="nav-arrow nav-next" onclick={nextSlide} aria-label="Next testimonial">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 18l6-6-6-6" />
				</svg>
			</button>
		{/if}
	</div>

	<!-- Dot Indicators -->
	{#if showDots && totalSlides > 1}
		<div class="dots" role="tablist" aria-label="Testimonial indicators">
			{#each testimonials as _, index}
				<button
					class="dot"
					class:active={index === currentIndex}
					onclick={() => goToSlide(index)}
					role="tab"
					aria-selected={index === currentIndex}
					aria-label="Go to testimonial {index + 1}"
				></button>
			{/each}
		</div>
	{/if}
</section>

<style>
	.testimonials {
		padding: var(--space-xl, 4.236rem) 0;
	}

	.testimonials:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 4px;
		border-radius: var(--radius-md, 8px);
	}

	.testimonials-header {
		text-align: center;
		margin-bottom: var(--space-lg, 2.618rem);
	}

	.headline {
		font-size: var(--text-h2, clamp(1.5rem, 2vw + 0.75rem, 2.25rem));
		font-weight: 600;
		color: var(--color-fg-primary, #fff);
		margin: 0 0 var(--space-sm, 1rem);
	}

	.subheadline {
		font-size: var(--text-body-lg, 1.125rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		margin: 0;
		max-width: 600px;
		margin-inline: auto;
	}

	.testimonials-container {
		display: flex;
		align-items: center;
		gap: var(--space-md, 1.618rem);
		max-width: 800px;
		margin: 0 auto;
	}

	.testimonial-viewport {
		position: relative;
		flex: 1;
		min-height: 280px;
	}

	.testimonial-card {
		position: absolute;
		inset: 0;
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-lg, 12px);
		padding: var(--space-lg, 2.618rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		opacity: 0;
		visibility: hidden;
		transform: translateX(20px);
		transition:
			opacity var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			transform var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			visibility var(--duration-standard, 300ms);
	}

	.testimonial-card.active {
		opacity: 1;
		visibility: visible;
		transform: translateX(0);
	}

	.quote-icon {
		color: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
		margin-bottom: var(--space-md, 1.618rem);
	}

	.quote-icon svg {
		width: 40px;
		height: 40px;
	}

	.rating {
		display: flex;
		gap: 4px;
		margin-bottom: var(--space-md, 1.618rem);
	}

	.star {
		width: 20px;
		height: 20px;
		color: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
	}

	.star.filled {
		color: var(--color-warning, #aa8844);
	}

	.quote {
		margin: 0;
		flex: 1;
	}

	.quote p {
		font-size: var(--text-body-lg, 1.125rem);
		line-height: 1.7;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		margin: 0;
		font-style: italic;
	}

	.author {
		display: flex;
		align-items: center;
		gap: var(--space-sm, 1rem);
		margin-top: var(--space-md, 1.618rem);
	}

	.avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.author-info {
		display: flex;
		flex-direction: column;
		text-align: left;
	}

	.author-name {
		font-size: var(--text-body, 1rem);
		font-weight: 600;
		font-style: normal;
		color: var(--color-fg-primary, #fff);
	}

	.author-role {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	/* Navigation Arrows */
	.nav-arrow {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		background: var(--color-bg-elevated, #0a0a0a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: 50%;
		color: var(--color-fg-primary, #fff);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--duration-micro, 200ms)
			var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.nav-arrow:hover {
		background: var(--color-bg-surface, #111);
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.nav-arrow:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	.nav-arrow svg {
		width: 20px;
		height: 20px;
	}

	/* Dot Indicators */
	.dots {
		display: flex;
		justify-content: center;
		gap: var(--space-xs, 0.5rem);
		margin-top: var(--space-lg, 2.618rem);
	}

	.dot {
		width: 8px;
		height: 8px;
		background: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
		border: none;
		border-radius: 50%;
		cursor: pointer;
		padding: 0;
		transition: all var(--duration-micro, 200ms)
			var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.dot:hover {
		background: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.dot:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	.dot.active {
		background: var(--color-fg-primary, #fff);
		width: 24px;
		border-radius: 4px;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.testimonials-container {
			padding: 0 var(--space-sm, 1rem);
		}

		.nav-arrow {
			display: none;
		}

		.testimonial-card {
			padding: var(--space-md, 1.618rem);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.testimonial-card,
		.nav-arrow,
		.dot {
			transition: none;
		}

		.testimonial-card {
			transform: none;
		}
	}
</style>
