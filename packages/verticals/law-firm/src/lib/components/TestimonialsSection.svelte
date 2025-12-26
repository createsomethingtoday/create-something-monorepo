<script lang="ts">
	/**
	 * TestimonialsSection - Single Powerful Quote
	 *
	 * Philosophy: One voice, fully present. Carousels fragment attention.
	 * A single testimonial, given room to breathe, builds more trust
	 * than a rotating parade of quotes you can't absorb.
	 *
	 * Zuhandenheit: The interface disappears; the voice remains.
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { onMount } from 'svelte';

	const siteConfig = getSiteConfigFromContext();
	// Use the first testimonial as the featured quote
	const testimonial = siteConfig.testimonials?.[0];

	let revealed = $state(false);

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					revealed = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.3 }
		);

		const section = document.getElementById('testimonial');
		if (section) observer.observe(section);

		return () => observer.disconnect();
	});
</script>

{#if testimonial}
	<section class="testimonial-section" id="testimonial" class:revealed>
		<div class="testimonial-container">
			<blockquote class="quote">
				<span class="quote-mark" aria-hidden="true">"</span>
				<p class="quote-text">{testimonial.quote}</p>
			</blockquote>

			<footer class="attribution">
				<span class="author-name">{testimonial.author}</span>
				{#if testimonial.title}
					<span class="author-context">{testimonial.title}</span>
				{/if}
			</footer>
		</div>
	</section>
{/if}

<style>
	.testimonial-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-surface);
	}

	.testimonial-container {
		max-width: 900px;
		margin: 0 auto;
		text-align: center;
	}

	.quote {
		margin: 0;
		padding: 0;
	}

	.quote-mark {
		display: block;
		font-size: clamp(4rem, 10vw, 8rem);
		font-weight: var(--font-semibold);
		color: var(--color-fg-subtle);
		line-height: 0.5;
		margin-bottom: var(--space-md);
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.revealed .quote-mark {
		opacity: 1;
		transform: translateY(0);
	}

	.quote-text {
		font-size: var(--text-h2);
		font-weight: var(--font-regular);
		font-style: italic;
		color: var(--color-fg-primary);
		line-height: 1.4;
		margin: 0 0 var(--space-lg);
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard) 0.1s;
	}

	.revealed .quote-text {
		opacity: 1;
		transform: translateY(0);
	}

	.attribution {
		display: flex;
		flex-direction: column;
		gap: 4px;
		opacity: 0;
		transform: translateY(10px);
		transition: all var(--duration-standard) var(--ease-standard) 0.2s;
	}

	.revealed .attribution {
		opacity: 1;
		transform: translateY(0);
	}

	.author-name {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		letter-spacing: 0.02em;
	}

	.author-context {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	@media (max-width: 768px) {
		.testimonial-section {
			padding: var(--space-xl) var(--space-md);
		}

		.quote-text {
			font-size: var(--text-h3);
		}

		.quote-mark {
			font-size: 4rem;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.quote-mark,
		.quote-text,
		.attribution {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
