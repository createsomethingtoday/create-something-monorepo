<script lang="ts">
	import { getSiteConfigFromContext } from '$lib/config/context';

	const siteConfig = getSiteConfigFromContext();

	interface Testimonial {
		quote: string;
		author: string;
		title?: string;
		rating?: number;
		image?: string;
	}

	interface Props {
		testimonials?: Testimonial[];
	}

	let { testimonials = siteConfig.testimonials }: Props = $props();
</script>

<section class="testimonials-section">
	<!-- Title: 2 words, Subtitle: 8 words (Fibonacci) -->
	<div class="container">
		<div class="section-header">
			<h2 class="section-title">Client Voices</h2>
			<p class="section-subtitle">Perspectives from those who've walked the path</p>
		</div>

		<div class="testimonials-grid stagger-children">
			{#each testimonials as testimonial}
				<div class="testimonial-card card-interactive stagger-item">
					<blockquote class="testimonial-quote">"{testimonial.quote}"</blockquote>
					<div class="testimonial-author">
						<span class="author-name">{testimonial.author}</span>
						{#if testimonial.title}
							<span class="author-company">{testimonial.title}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.testimonials-section {
		padding: var(--space-3xl) 0;
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: var(--container-xl);
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.testimonials-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-lg);
	}

	@media (min-width: 768px) {
		.testimonials-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.testimonial-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
	}

	.testimonial-quote {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		font-style: italic;
		flex: 1;
		margin: 0 0 var(--space-md) 0;
	}

	.testimonial-author {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.author-name {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.author-company {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
</style>
